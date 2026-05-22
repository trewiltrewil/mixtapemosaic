import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    eventName?: string;
    anonymousId?: string;
    path?: string;
    metadata?: Record<string, unknown>;
  } | null;

  if (!body?.eventName) {
    return NextResponse.json({ error: "eventName is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "Supabase is not configured." });
  }

  const { error } = await supabase.from("visitor_events").insert({
    event_name: body.eventName,
    anonymous_id: body.anonymousId ?? null,
    path: body.path ?? null,
    user_agent: request.headers.get("user-agent"),
    metadata: body.metadata ?? {}
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
