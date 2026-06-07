import { NextResponse } from "next/server";
import { getActiveProductVariants } from "@/lib/cms";

export const runtime = "nodejs";

export async function GET() {
  const variants = await getActiveProductVariants();
  return NextResponse.json({ variants });
}
