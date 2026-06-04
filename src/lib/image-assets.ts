import sharp from "sharp";
import { getSupabaseAdminClient } from "./supabase";

export type ImageAssetStatus = "draft" | "active" | "archived" | "processing" | "failed";

export type ImageAssetRecord = {
  id: string;
  title: string;
  description: string | null;
  alt_text: string | null;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_author: string | null;
  source_license: string | null;
  source_downloaded_at: string | null;
  // Original files stay private and are reserved for admin review and future print production export.
  original_storage_key: string;
  original_filename: string;
  original_content_type: string;
  original_width: number | null;
  original_height: number | null;
  original_size_bytes: number | null;
  thumb_storage_key: string | null;
  card_storage_key: string | null;
  preview_storage_key: string | null;
  large_storage_key: string | null;
  thumb_url: string | null;
  card_url: string | null;
  preview_url: string | null;
  large_url: string | null;
  dominant_color: string | null;
  blurhash: string | null;
  tags: string[];
  categories: string[];
  status: ImageAssetStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type PublicImageAsset = Pick<
  ImageAssetRecord,
  | "id"
  | "title"
  | "description"
  | "alt_text"
  | "thumb_url"
  | "card_url"
  | "preview_url"
  | "large_url"
  | "dominant_color"
  | "blurhash"
  | "tags"
  | "categories"
>;

// Public image assets intentionally omit original_storage_key and any full-resolution source URL.

export type AssetMetadataInput = {
  title: string;
  description?: string | null;
  alt_text?: string | null;
  source_type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  source_author?: string | null;
  source_license?: string | null;
  source_downloaded_at?: string | null;
  tags?: string[];
  categories?: string[];
  status?: ImageAssetStatus;
  created_by?: string | null;
};

const originalsBucket = process.env.SUPABASE_IMAGE_ORIGINALS_BUCKET ?? "image-originals";
const derivativesBucket = process.env.SUPABASE_IMAGE_DERIVATIVES_BUCKET ?? "image-derivatives";

const derivativeTargets = {
  thumb: 300,
  card: 800,
  preview: 1600,
  large: 2400
} as const;

function requireSupabaseAdmin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanStatus(value: unknown): ImageAssetStatus {
  return value === "active" || value === "archived" || value === "processing" || value === "failed"
    ? value
    : "draft";
}

export function parseList(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function metadataFromFormData(formData: FormData): AssetMetadataInput {
  return {
    title: cleanText(formData.get("title")) ?? "Untitled image",
    description: cleanText(formData.get("description")),
    alt_text: cleanText(formData.get("alt_text")),
    source_type: cleanText(formData.get("source_type")) ?? "manual_upload",
    source_name: cleanText(formData.get("source_name")),
    source_url: cleanText(formData.get("source_url")),
    source_author: cleanText(formData.get("source_author")),
    source_license: cleanText(formData.get("source_license")),
    source_downloaded_at: cleanText(formData.get("source_downloaded_at")),
    tags: parseList(formData.get("tags")),
    categories: parseList(formData.get("categories")),
    status: cleanStatus(formData.get("status"))
  };
}

function extensionForContentType(contentType: string, filename: string) {
  if (contentType === "image/png") {
    return "png";
  }
  if (contentType === "image/webp") {
    return "webp";
  }
  if (contentType === "image/tiff") {
    return "tif";
  }
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

function toPublicAsset(record: ImageAssetRecord): PublicImageAsset {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    alt_text: record.alt_text,
    thumb_url: record.thumb_url,
    card_url: record.card_url,
    preview_url: record.preview_url,
    large_url: record.large_url,
    dominant_color: record.dominant_color,
    blurhash: record.blurhash,
    tags: record.tags ?? [],
    categories: record.categories ?? []
  };
}

function dominantColorFromStats(stats: sharp.Stats) {
  const channels = stats.channels.slice(0, 3);
  if (channels.length < 3) {
    return null;
  }

  return `#${channels
    .map((channel) => Math.round(channel.mean).toString(16).padStart(2, "0"))
    .join("")}`;
}

function publicUrl(bucket: string, key: string) {
  const explicitBase = process.env.SUPABASE_PUBLIC_IMAGE_BASE_URL;
  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, "")}/${key}`;
  }

  const supabase = requireSupabaseAdmin();
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

export async function listAdminImageAssets() {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("image_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ImageAssetRecord[];
}

export async function listPublicImageAssets() {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("image_assets")
    .select(
      "id,title,description,alt_text,thumb_url,card_url,preview_url,large_url,dominant_color,blurhash,tags,categories"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ImageAssetRecord[]).map(toPublicAsset);
}

export async function getAdminImageAsset(id: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.from("image_assets").select("*").eq("id", id).single();

  if (error) {
    throw error;
  }

  return data as ImageAssetRecord;
}

export async function updateImageAssetMetadata(id: string, metadata: AssetMetadataInput) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("image_assets")
    .update({
      title: metadata.title,
      description: metadata.description ?? null,
      alt_text: metadata.alt_text ?? null,
      source_type: metadata.source_type ?? "manual_upload",
      source_name: metadata.source_name ?? null,
      source_url: metadata.source_url ?? null,
      source_author: metadata.source_author ?? null,
      source_license: metadata.source_license ?? null,
      source_downloaded_at: metadata.source_downloaded_at || null,
      tags: metadata.tags ?? [],
      categories: metadata.categories ?? [],
      status: metadata.status ?? "draft",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ImageAssetRecord;
}

export async function archiveImageAsset(id: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("image_assets")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ImageAssetRecord;
}

export async function createImageAssetFromUpload(file: File, metadata: AssetMetadataInput) {
  const supabase = requireSupabaseAdmin();
  const id = crypto.randomUUID();
  const contentType = file.type || "application/octet-stream";
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const ext = extensionForContentType(contentType, file.name);
  const originalStorageKey = `originals/${id}/source.${ext}`;
  const baseSharp = sharp(originalBuffer, { failOn: "none" });
  const [imageMetadata, stats] = await Promise.all([baseSharp.metadata(), sharp(originalBuffer).stats()]);
  const dominantColor = dominantColorFromStats(stats);

  const { error: originalError } = await supabase.storage
    .from(originalsBucket)
    .upload(originalStorageKey, originalBuffer, {
      contentType,
      upsert: false
    });

  if (originalError) {
    throw originalError;
  }

  const derivativeKeys: Record<keyof typeof derivativeTargets, string> = {
    thumb: `derivatives/${id}/thumb.webp`,
    card: `derivatives/${id}/card.webp`,
    preview: `derivatives/${id}/preview.webp`,
    large: `derivatives/${id}/large.webp`
  };

  for (const [name, width] of Object.entries(derivativeTargets) as Array<
    [keyof typeof derivativeTargets, number]
  >) {
    const output = await sharp(originalBuffer, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const { error } = await supabase.storage.from(derivativesBucket).upload(derivativeKeys[name], output, {
      contentType: "image/webp",
      upsert: true
    });

    if (error) {
      await supabase.from("image_assets").insert({
        id,
        title: metadata.title,
        source_type: metadata.source_type ?? "manual_upload",
        original_storage_key: originalStorageKey,
        original_filename: file.name,
        original_content_type: contentType,
        original_width: imageMetadata.width ?? null,
        original_height: imageMetadata.height ?? null,
        original_size_bytes: originalBuffer.byteLength,
        status: "failed",
        updated_at: new Date().toISOString()
      });
      throw error;
    }
  }

  const row = {
    id,
    title: metadata.title,
    description: metadata.description ?? null,
    alt_text: metadata.alt_text ?? metadata.title,
    source_type: metadata.source_type ?? "manual_upload",
    source_name: metadata.source_name ?? null,
    source_url: metadata.source_url ?? null,
    source_author: metadata.source_author ?? null,
    source_license: metadata.source_license ?? null,
    source_downloaded_at: metadata.source_downloaded_at || null,
    original_storage_key: originalStorageKey,
    original_filename: file.name,
    original_content_type: contentType,
    original_width: imageMetadata.width ?? null,
    original_height: imageMetadata.height ?? null,
    original_size_bytes: originalBuffer.byteLength,
    thumb_storage_key: derivativeKeys.thumb,
    card_storage_key: derivativeKeys.card,
    preview_storage_key: derivativeKeys.preview,
    large_storage_key: derivativeKeys.large,
    thumb_url: publicUrl(derivativesBucket, derivativeKeys.thumb),
    card_url: publicUrl(derivativesBucket, derivativeKeys.card),
    preview_url: publicUrl(derivativesBucket, derivativeKeys.preview),
    large_url: publicUrl(derivativesBucket, derivativeKeys.large),
    dominant_color: dominantColor,
    blurhash: null,
    tags: metadata.tags ?? [],
    categories: metadata.categories ?? [],
    status: metadata.status ?? "draft",
    created_by: metadata.created_by ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("image_assets").insert(row).select("*").single();

  if (error) {
    throw error;
  }

  return data as ImageAssetRecord;
}
