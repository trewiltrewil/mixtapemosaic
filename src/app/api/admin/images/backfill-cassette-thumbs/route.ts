import { NextResponse } from "next/server";
import {
  generateAndSaveCassetteThumb,
  listImageAssetsForCassetteThumbBackfill
} from "@/lib/image-assets";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown thumbnail error";
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { force?: boolean; limit?: number; offset?: number } | null;
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 4), 8));
    const offset = Math.max(0, Number(body?.offset ?? 0));
    const force = Boolean(body?.force);
    const missing = await listImageAssetsForCassetteThumbBackfill(limit, offset, force);
    const updated = [];
    const failed = [];

    for (const asset of missing) {
      try {
        updated.push(await generateAndSaveCassetteThumb(asset));
      } catch (error) {
        failed.push({
          id: asset.id,
          title: asset.title,
          error: errorMessage(error)
        });
      }
    }

    return NextResponse.json({
      updated,
      failed,
      processed: updated.length + failed.length,
      hasMore: missing.length === limit
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) || "Could not backfill cassette thumbnails." },
      { status: 500 }
    );
  }
}
