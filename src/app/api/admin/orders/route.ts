import { NextResponse } from "next/server";
import { listAdminOrders } from "@/lib/admin-orders";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const result = await listAdminOrders({
      query: url.searchParams.get("q"),
      limit: numberParam(url.searchParams.get("limit"), 40),
      offset: numberParam(url.searchParams.get("offset"), 0)
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load orders." },
      { status: 500 }
    );
  }
}
