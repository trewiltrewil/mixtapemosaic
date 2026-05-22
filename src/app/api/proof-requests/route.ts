import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    customizationSessionId?: string;
    email?: string;
    name?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  } | null;

  if (!body?.email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, id: crypto.randomUUID(), skipped: "Supabase is not configured." });
  }

  const { data, error } = await supabase
    .from("proof_requests")
    .insert({
      customization_session_id: body.customizationSessionId ?? null,
      email: body.email,
      name: body.name ?? null,
      notes: body.notes ?? null,
      metadata: body.metadata ?? {}
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
