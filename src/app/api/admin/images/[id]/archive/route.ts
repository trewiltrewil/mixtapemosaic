import { NextResponse } from "next/server";
import { archiveImageAsset } from "@/lib/image-assets";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const asset = await archiveImageAsset(id);
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not archive image asset." },
      { status: 500 }
    );
  }
}

