import { NextResponse } from "next/server";
import { getPublicImageAssetById, searchPublicImageAssets } from "@/lib/image-assets";

export const runtime = "nodejs";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const asset = await getPublicImageAssetById(id);
      return NextResponse.json({ assets: [asset], hasMore: false, nextOffset: 1 });
    }

    const assets = await searchPublicImageAssets({
      query: url.searchParams.get("q"),
      curatedOnly: url.searchParams.get("curatedOnly") === "true",
      limit: numberParam(url.searchParams.get("limit"), 24),
      offset: numberParam(url.searchParams.get("offset"), 0),
      category: url.searchParams.get("category"),
      tag: url.searchParams.get("tag"),
      seed: url.searchParams.get("seed")
    });

    return NextResponse.json(assets);
  } catch {
    return NextResponse.json({ assets: [], hasMore: false, nextOffset: 0 }, { status: 200 });
  }
}
