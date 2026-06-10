import { NextResponse } from "next/server";
import { getAdminImageAsset, updateImageAssetMetadata, type AssetMetadataInput } from "@/lib/image-assets";
import { revalidateImageLibraryViews } from "@/lib/image-library-revalidation";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function bodyToMetadata(body: Record<string, unknown>): AssetMetadataInput {
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  return {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Untitled image",
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    alt_text: typeof body.alt_text === "string" && body.alt_text.trim() ? body.alt_text.trim() : null,
    source_type:
      typeof body.source_type === "string" && body.source_type.trim() ? body.source_type.trim() : "manual_upload",
    source_name: typeof body.source_name === "string" && body.source_name.trim() ? body.source_name.trim() : null,
    source_url: typeof body.source_url === "string" && body.source_url.trim() ? body.source_url.trim() : null,
    source_author:
      typeof body.source_author === "string" && body.source_author.trim() ? body.source_author.trim() : null,
    source_license:
      typeof body.source_license === "string" && body.source_license.trim() ? body.source_license.trim() : null,
    source_downloaded_at:
      typeof body.source_downloaded_at === "string" && body.source_downloaded_at.trim()
        ? body.source_downloaded_at.trim()
        : null,
    tags: list(body.tags),
    categories: list(body.categories),
    status:
      body.status === "active" ||
      body.status === "archived" ||
      body.status === "processing" ||
      body.status === "failed"
        ? body.status
        : "draft"
  };
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const asset = await getAdminImageAsset(id);
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load image asset." },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const asset = await updateImageAssetMetadata(id, bodyToMetadata(body));
    revalidateImageLibraryViews();
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update image asset." },
      { status: 500 }
    );
  }
}
