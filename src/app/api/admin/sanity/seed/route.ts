import { NextResponse } from "next/server";
import { seedSanityStarterContent } from "@/lib/sanity-seed";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedSanityStarterContent();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not seed Sanity starter content." },
      { status: 500 }
    );
  }
}
