import { NextResponse } from "next/server";
import { completeCustomerArtworkUpload } from "@/lib/customer-artwork";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const originalStorageKey = typeof body.originalStorageKey === "string" ? body.originalStorageKey : "";
    const originalFilename = typeof body.originalFilename === "string" ? body.originalFilename : "customer-artwork.jpg";
    const originalContentType =
      typeof body.originalContentType === "string" ? body.originalContentType : "application/octet-stream";
    const originalSizeBytes = Number(body.originalSizeBytes ?? 0);

    if (!id || !originalStorageKey) {
      return NextResponse.json({ error: "Uploaded customer artwork is required." }, { status: 400 });
    }

    if (!originalContentType.startsWith("image/")) {
      return NextResponse.json({ error: "Upload must be an image file." }, { status: 400 });
    }

    const upload = await completeCustomerArtworkUpload({
      id,
      originalStorageKey,
      originalFilename,
      originalContentType,
      originalSizeBytes: Number.isFinite(originalSizeBytes) ? originalSizeBytes : null
    });

    return NextResponse.json({ upload }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save customer artwork upload." },
      { status: 500 }
    );
  }
}
