import type Stripe from "stripe";

export const mixtapeBrand = {
  id: "mixtape_mosaic",
  name: "Mixtape Mosaic",
  domain: "mixtapemosaic.com",
  source: "mixtapemosaic.com"
} as const;

export const productVariants = {
  square: {
    id: "square",
    label: '9 Panel Square (28"x28")',
    productType: '9 Panel Square - 28in x 28in',
    priceCents: 139500
  },
  landscape: {
    id: "landscape",
    label: 'Landscape (45"x24")',
    productType: 'Landscape Panel - 45in x 24in',
    priceCents: 139500
  },
  portrait: {
    id: "portrait",
    label: 'Portrait (27"x45")',
    productType: 'Portrait Panel - 27in x 45in',
    priceCents: 139500
  }
} as const;

export type ProductVariantId = keyof typeof productVariants;
export type ProductVariant = {
  id: string;
  label: string;
  productType: string;
  priceCents: number;
};

export type CheckoutItemInput = {
  productVariantId?: string;
  size?: string;
  artworkName?: string;
  artworkSource?: string;
  customizationSessionId?: string;
  customerArtworkUploadId?: string;
  previewSnapshotKey?: string;
  previewSnapshotPath?: string;
};

export function getProductVariant(input?: CheckoutItemInput | null) {
  const id = input?.productVariantId;
  if (id && id in productVariants) {
    return productVariants[id as ProductVariantId];
  }

  const size = input?.size?.toLowerCase() ?? "";
  if (size.includes("landscape")) {
    return productVariants.landscape;
  }
  if (size.includes("portrait")) {
    return productVariants.portrait;
  }

  return productVariants.square;
}

export function metadataFromCheckoutItem(input: CheckoutItemInput | null | undefined, trustedVariant?: ProductVariant) {
  const variant = trustedVariant ?? getProductVariant(input);
  return {
    brand_id: mixtapeBrand.id,
    brand: mixtapeBrand.name,
    source: mixtapeBrand.source,
    product_type: variant.productType,
    product_variant_id: variant.id,
    selected_size: input?.size || variant.label,
    artwork_source: input?.artworkSource ?? "",
    artwork_name: input?.artworkName ?? "",
    customization_session_id: input?.customizationSessionId ?? "",
    customer_artwork_upload_id: input?.customerArtworkUploadId ?? "",
    preview_snapshot_key: input?.previewSnapshotKey ?? input?.previewSnapshotPath ?? ""
  };
}

export function stripeMetadata(input: CheckoutItemInput | null | undefined): Stripe.MetadataParam {
  return metadataFromCheckoutItem(input);
}

export function isUuid(value: string | undefined | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
