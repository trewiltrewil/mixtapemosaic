import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { linkCustomerArtworkToSession } from "@/lib/customer-artwork";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    selectedSize?: string;
    artworkSource?: string;
    artworkName?: string;
    artworkImageAssetId?: string | null;
    artworkUrl?: string;
    previewSnapshotKey?: string;
    previewSnapshotPath?: string;
    customerArtworkUploadId?: string;
    state?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } | null;

  const id = crypto.randomUUID();
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, id, skipped: "Supabase is not configured." });
  }

  const row = {
    id,
    selected_size: body?.selectedSize ?? null,
    artwork_source: body?.artworkSource ?? null,
    artwork_name: body?.artworkName ?? null,
    artwork_image_asset_id: body?.artworkImageAssetId ?? null,
    artwork_url: body?.artworkUrl ?? null,
    preview_snapshot_path: body?.previewSnapshotKey ?? body?.previewSnapshotPath ?? null,
    customer_artwork_upload_id: body?.customerArtworkUploadId ?? null,
    state: body?.state ?? {},
    metadata: body?.metadata ?? {}
  };

  let { data, error } = await supabase
    .from("customization_sessions")
    .insert(row)
    .select("id")
    .single();

  if (error && error.message?.includes("artwork_image_asset_id")) {
    const { artwork_image_asset_id: _artworkImageAssetId, ...legacyRow } = row;
    const retry = await supabase.from("customization_sessions").insert(legacyRow).select("id").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Customization session was not saved." }, { status: 500 });
  }

  if (body?.customerArtworkUploadId) {
    await linkCustomerArtworkToSession(body.customerArtworkUploadId, data.id);
  }

  return NextResponse.json({ ok: true, id: data.id });
}
