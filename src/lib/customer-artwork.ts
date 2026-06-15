import sharp from "sharp";
import { getSupabaseAdminClient } from "./supabase";
import { createR2PutUploadUrl, downloadR2ObjectBuffer, getR2BucketNames } from "./r2";
import { extensionForContentType } from "./image-assets";

export type CustomerArtworkUploadRecord = {
  id: string;
  original_storage_key: string;
  original_filename: string;
  original_content_type: string;
  original_width: number | null;
  original_height: number | null;
  original_size_bytes: number | null;
  status: "uploaded" | "linked" | "failed" | "archived";
};

const maxCustomerUploadBytes = 250 * 1024 * 1024;

function requireSupabaseAdmin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

export async function prepareCustomerArtworkUpload({
  filename,
  contentType,
  sizeBytes
}: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  if (!contentType.startsWith("image/")) {
    throw new Error("Upload must be an image file.");
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Upload size is required.");
  }

  if (sizeBytes > maxCustomerUploadBytes) {
    throw new Error("Image is over the current 250 MB customer upload limit.");
  }

  const id = crypto.randomUUID();
  const ext = extensionForContentType(contentType, filename);
  const originalStorageKey = `customer-uploads/${id}/source.${ext}`;
  const uploadUrl = await createR2PutUploadUrl({
    bucket: getR2BucketNames().customerUploads,
    key: originalStorageKey,
    contentType
  });

  return {
    id,
    originalStorageKey,
    uploadUrl,
    contentType,
    expiresInSeconds: 600
  };
}

export async function completeCustomerArtworkUpload({
  id,
  originalStorageKey,
  originalFilename,
  originalContentType,
  originalSizeBytes
}: {
  id: string;
  originalStorageKey: string;
  originalFilename: string;
  originalContentType: string;
  originalSizeBytes?: number | null;
}) {
  const supabase = requireSupabaseAdmin();
  const originalBuffer = await downloadR2ObjectBuffer({
    bucket: getR2BucketNames().customerUploads,
    key: originalStorageKey
  });
  const imageMetadata = await sharp(originalBuffer, { failOn: "none" }).metadata();

  const { data, error } = await supabase
    .from("customer_artwork_uploads")
    .insert({
      id,
      original_storage_key: originalStorageKey,
      original_filename: originalFilename,
      original_content_type: originalContentType,
      original_width: imageMetadata.width ?? null,
      original_height: imageMetadata.height ?? null,
      original_size_bytes: originalSizeBytes ?? originalBuffer.byteLength,
      status: "uploaded"
    })
    .select(
      "id,original_storage_key,original_filename,original_content_type,original_width,original_height,original_size_bytes,status"
    )
    .single();

  if (error) {
    throw error;
  }

  return data as CustomerArtworkUploadRecord;
}

export async function linkCustomerArtworkToSession(uploadId: string, customizationSessionId: string) {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase
    .from("customer_artwork_uploads")
    .update({
      customization_session_id: customizationSessionId,
      status: "linked",
      updated_at: new Date().toISOString()
    })
    .eq("id", uploadId);

  if (error) {
    throw error;
  }
}

export async function getAdminCustomerArtworkUpload(id: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("customer_artwork_uploads")
    .select("id,original_storage_key,original_filename,original_content_type,original_width,original_height,original_size_bytes,status")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as CustomerArtworkUploadRecord;
}
