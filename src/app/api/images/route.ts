import { NextResponse } from "next/server";
import { listPublicImageAssets } from "@/lib/image-assets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await listPublicImageAssets();
    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ assets: [] }, { status: 200 });
  }
}
