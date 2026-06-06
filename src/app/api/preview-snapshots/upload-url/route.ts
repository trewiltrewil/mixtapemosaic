import { NextResponse } from "next/server";
import { createR2PutUploadUrl, getR2BucketNames } from "@/lib/r2";

export const runtime = "nodejs";

const maxPreviewSnapshotBytes = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    contentType?: string;
    sizeBytes?: number;
  } | null;

  const contentType = body?.contentType || "image/webp";
  const sizeBytes = body?.sizeBytes ?? 0;

  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Preview snapshot must be an image." }, { status: 400 });
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxPreviewSnapshotBytes) {
    return NextResponse.json({ error: "Preview snapshot is too large." }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    const key = `customer-preview-snapshots/${id}/preview.webp`;
    const uploadUrl = await createR2PutUploadUrl({
      bucket: getR2BucketNames().customerUploads,
      key,
      contentType
    });

    return NextResponse.json({
      id,
      previewSnapshotKey: key,
      uploadUrl,
      contentType,
      expiresInSeconds: 600
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare preview snapshot upload." },
      { status: 500 }
    );
  }
}
