import { NextResponse } from "next/server";
import {
  createImageAssetFromUpload,
  listAdminImageAssets,
  metadataFromFormData
} from "@/lib/image-assets";
import { revalidateImageLibraryViews } from "@/lib/image-library-revalidation";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const result = await listAdminImageAssets({
      query: url.searchParams.get("q"),
      limit: numberParam(url.searchParams.get("limit"), 48),
      offset: numberParam(url.searchParams.get("offset"), 0)
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load customizer artwork." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload must be an image file." }, { status: 400 });
    }

    const asset = await createImageAssetFromUpload(file, metadataFromFormData(formData));
    revalidateImageLibraryViews();
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload image asset." },
      { status: 500 }
    );
  }
}
