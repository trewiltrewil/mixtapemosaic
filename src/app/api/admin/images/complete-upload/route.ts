import { NextResponse } from "next/server";
import {
  createImageAssetFromOriginalBuffer,
  type AssetMetadataInput
} from "@/lib/image-assets";
import {
  deriveSourceMetadataFromFilename,
  generateArtworkMetadata,
  mergeMetadata
} from "@/lib/artwork-auto-metadata";
import { downloadR2ObjectBuffer, getR2BucketNames } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

function listFromBody(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function metadataFromBody(body: Record<string, unknown>): AssetMetadataInput {
  const status = body.status;
  return {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "",
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    alt_text: typeof body.alt_text === "string" && body.alt_text.trim() ? body.alt_text.trim() : null,
    source_type: typeof body.source_type === "string" && body.source_type.trim() ? body.source_type.trim() : "manual_upload",
    source_name: typeof body.source_name === "string" && body.source_name.trim() ? body.source_name.trim() : null,
    source_url: typeof body.source_url === "string" && body.source_url.trim() ? body.source_url.trim() : null,
    source_author: typeof body.source_author === "string" && body.source_author.trim() ? body.source_author.trim() : null,
    source_license:
      typeof body.source_license === "string" && body.source_license.trim() ? body.source_license.trim() : null,
    source_downloaded_at:
      typeof body.source_downloaded_at === "string" && body.source_downloaded_at.trim()
        ? body.source_downloaded_at.trim()
        : null,
    tags: listFromBody(body.tags),
    categories: listFromBody(body.categories),
    status:
      status === "active" || status === "archived" || status === "processing" || status === "failed"
        ? status
        : "active"
  };
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const originalStorageKey = typeof body.originalStorageKey === "string" ? body.originalStorageKey : "";
    const originalFilename = typeof body.originalFilename === "string" ? body.originalFilename : "source.jpg";
    const originalContentType =
      typeof body.originalContentType === "string" ? body.originalContentType : "application/octet-stream";
    const originalSizeBytes = Number(body.originalSizeBytes ?? 0);

    if (!id || !originalStorageKey) {
      return NextResponse.json({ error: "Uploaded R2 original is required." }, { status: 400 });
    }

    if (!originalContentType.startsWith("image/")) {
      return NextResponse.json({ error: "Upload must be an image file." }, { status: 400 });
    }

    const buckets = getR2BucketNames();
    const originalBuffer = await downloadR2ObjectBuffer({ bucket: buckets.originals, key: originalStorageKey });
    const submittedMetadata = metadataFromBody(body);
    const filenameDefaults = deriveSourceMetadataFromFilename(originalFilename);
    const generatedMetadata = await generateArtworkMetadata({
      originalBuffer,
      filename: originalFilename,
      contentType: originalContentType
    }).catch(() => null);

    const asset = await createImageAssetFromOriginalBuffer({
      id,
      originalBuffer,
      originalStorageKey,
      originalFilename,
      originalContentType,
      originalSizeBytes: Number.isFinite(originalSizeBytes) ? originalSizeBytes : null,
      metadata: mergeMetadata({
        submitted: submittedMetadata,
        generated: generatedMetadata,
        filenameDefaults
      })
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process uploaded image asset." },
      { status: 500 }
    );
  }
}
