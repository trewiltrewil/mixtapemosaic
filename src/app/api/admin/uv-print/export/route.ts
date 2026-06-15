import { NextResponse } from "next/server";
import { getAdminCustomizationSession, getAdminOrder } from "@/lib/admin-orders";
import { getAdminCustomerArtworkUpload } from "@/lib/customer-artwork";
import { getAdminImageAsset } from "@/lib/image-assets";
import { downloadR2ObjectBuffer, getR2BucketNames } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-admin";
import { generateUvPrintZip } from "@/lib/uv-print";
import { getActiveProductVariantById } from "@/lib/cms";
import { isUuid } from "@/lib/commerce";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExportRequest = {
  sourceType?: "image_asset" | "customer_upload" | "order";
  imageAssetId?: string;
  customerArtworkUploadId?: string;
  orderId?: string;
  productVariantId?: string;
  dpi?: number;
  bleedMm?: number;
  mirror?: boolean;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveSource(body: ExportRequest) {
  const buckets = getR2BucketNames();

  if (body.sourceType === "image_asset") {
    const imageAssetId = stringValue(body.imageAssetId);
    if (!imageAssetId) {
      throw new Error("Image asset id is required.");
    }

    const asset = await getAdminImageAsset(imageAssetId);
    return {
      sourceLabel: asset.title || asset.original_filename || asset.id,
      sourceBuffer: await downloadR2ObjectBuffer({ bucket: buckets.originals, key: asset.original_storage_key }),
      productVariantId: stringValue(body.productVariantId)
    };
  }

  if (body.sourceType === "customer_upload") {
    const uploadId = stringValue(body.customerArtworkUploadId);
    if (!uploadId) {
      throw new Error("Customer upload id is required.");
    }

    const upload = await getAdminCustomerArtworkUpload(uploadId);
    return {
      sourceLabel: upload.original_filename || upload.id,
      sourceBuffer: await downloadR2ObjectBuffer({ bucket: buckets.customerUploads, key: upload.original_storage_key }),
      productVariantId: stringValue(body.productVariantId)
    };
  }

  if (body.sourceType === "order") {
    const orderId = stringValue(body.orderId);
    if (!orderId) {
      throw new Error("Order id is required.");
    }

    const order = await getAdminOrder(orderId);
    const metadata = order.metadata ?? {};
    let imageAssetId = order.artwork_image_asset_id ?? stringValue(metadata.artwork_image_asset_id);
    let customerUploadId = order.customer_artwork_upload_id ?? stringValue(metadata.customer_artwork_upload_id);
    let variantId = stringValue(body.productVariantId) ?? stringValue(metadata.product_variant_id);

    if (order.customization_session_id && (!imageAssetId || !customerUploadId || !variantId)) {
      const session = await getAdminCustomizationSession(order.customization_session_id).catch(() => null);
      imageAssetId = imageAssetId ?? session?.artwork_image_asset_id ?? stringValue(session?.metadata?.artworkImageAssetId);
      customerUploadId = customerUploadId ?? session?.customer_artwork_upload_id ?? stringValue(session?.metadata?.customerArtworkUploadId);
      variantId = variantId ?? stringValue(session?.state?.productVariantId);
    }

    if (imageAssetId && isUuid(imageAssetId)) {
      const asset = await getAdminImageAsset(imageAssetId);
      return {
        sourceLabel: `order-${order.id}-${asset.title || asset.original_filename}`,
        sourceBuffer: await downloadR2ObjectBuffer({ bucket: buckets.originals, key: asset.original_storage_key }),
        productVariantId: variantId
      };
    }

    if (customerUploadId && isUuid(customerUploadId)) {
      const upload = await getAdminCustomerArtworkUpload(customerUploadId);
      return {
        sourceLabel: `order-${order.id}-${upload.original_filename || upload.id}`,
        sourceBuffer: await downloadR2ObjectBuffer({ bucket: buckets.customerUploads, key: upload.original_storage_key }),
        productVariantId: variantId
      };
    }

    throw new Error("This order does not have a production source image. Select an image from the library or use a newer order with saved artwork id.");
  }

  throw new Error("sourceType must be image_asset, customer_upload, or order.");
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ExportRequest;
    const source = await resolveSource(body);
    const productVariantId = stringValue(body.productVariantId) ?? source.productVariantId;
    if (!productVariantId) {
      return NextResponse.json({ error: "Product variant is required for UV export." }, { status: 400 });
    }

    const variant = await getActiveProductVariantById(productVariantId);
    if (!variant) {
      return NextResponse.json({ error: "Selected product variant is not available." }, { status: 400 });
    }

    const zip = await generateUvPrintZip({
      sourceBuffer: source.sourceBuffer,
      sourceLabel: source.sourceLabel,
      variant,
      dpi: body.dpi,
      bleedMm: body.bleedMm,
      mirror: body.mirror
    });

    return new NextResponse(new Uint8Array(zip.buffer), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${zip.filename}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate UV print export." },
      { status: 500 }
    );
  }
}
