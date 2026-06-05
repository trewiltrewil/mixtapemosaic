import { NextResponse } from "next/server";
import { prepareCustomerArtworkUpload } from "@/lib/customer-artwork";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
    };

    const upload = await prepareCustomerArtworkUpload({
      filename: body.filename?.trim() || "customer-artwork.jpg",
      contentType: body.contentType?.trim() || "application/octet-stream",
      sizeBytes: Number(body.sizeBytes ?? 0)
    });

    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare customer artwork upload." },
      { status: 400 }
    );
  }
}
