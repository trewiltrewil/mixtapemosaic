import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Use a real email address." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Newsletter storage is not configured yet." }, { status: 503 });
  }

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      email,
      source: "footer",
      status: "subscribed",
      metadata: {
        path: request.headers.get("referer") || null,
        user_agent: request.headers.get("user-agent") || null
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("Newsletter subscription failed", error);
    return NextResponse.json({ error: "That did not record. Try it again in a minute." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
