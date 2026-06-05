import { NextResponse } from "next/server";
import { extensionForContentType } from "@/lib/image-assets";
import { createR2PutUploadUrl, getR2BucketNames } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

const maxUploadBytes = 250 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
    };

    const filename = body.filename?.trim() || "source.jpg";
    const contentType = body.contentType?.trim() || "application/octet-stream";
    const sizeBytes = Number(body.sizeBytes ?? 0);

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Upload must be an image file." }, { status: 400 });
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: "Upload size is required." }, { status: 400 });
    }

    if (sizeBytes > maxUploadBytes) {
      return NextResponse.json(
        { error: "Image is over the current 250 MB admin upload limit." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const ext = extensionForContentType(contentType, filename);
    const originalStorageKey = `originals/${id}/source.${ext}`;
    const uploadUrl = await createR2PutUploadUrl({
      bucket: getR2BucketNames().originals,
      key: originalStorageKey,
      contentType
    });

    return NextResponse.json({
      id,
      originalStorageKey,
      uploadUrl,
      contentType,
      expiresInSeconds: 600
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare image upload." },
      { status: 500 }
    );
  }
}
