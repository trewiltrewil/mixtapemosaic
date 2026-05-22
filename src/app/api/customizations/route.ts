import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    selectedSize?: string;
    artworkSource?: string;
    artworkName?: string;
    artworkUrl?: string;
    previewSnapshotPath?: string;
    state?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } | null;

  const id = crypto.randomUUID();
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, id, skipped: "Supabase is not configured." });
  }

  const { data, error } = await supabase
    .from("customization_sessions")
    .insert({
      id,
      selected_size: body?.selectedSize ?? null,
      artwork_source: body?.artworkSource ?? null,
      artwork_name: body?.artworkName ?? null,
      artwork_url: body?.artworkUrl ?? null,
      preview_snapshot_path: body?.previewSnapshotPath ?? null,
      state: body?.state ?? {},
      metadata: body?.metadata ?? {}
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
