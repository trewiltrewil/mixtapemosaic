import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password login has been replaced by Cloudflare Access." },
    { status: 410 }
  );
}
