import { NextResponse } from "next/server";
import { adminPassword, adminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = adminPassword();

  if (!password) {
    return NextResponse.json({ error: "Admin password is not configured." }, { status: 503 });
  }

  if (!body?.password || body.password !== password) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("mtm_admin", await adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
