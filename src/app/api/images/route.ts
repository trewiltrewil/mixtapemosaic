import { NextResponse } from "next/server";
import { searchPublicImageAssets } from "@/lib/image-assets";

export const runtime = "nodejs";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const assets = await searchPublicImageAssets({
      query: url.searchParams.get("q"),
      curatedOnly: url.searchParams.get("curatedOnly") === "true",
      limit: numberParam(url.searchParams.get("limit"), 24),
      offset: numberParam(url.searchParams.get("offset"), 0)
    });

    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ assets: [] }, { status: 200 });
  }
}
