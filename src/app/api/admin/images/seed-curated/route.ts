import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  createImageAssetFromUpload,
  listAdminImageAssets,
  type AssetMetadataInput,
  type ImageAssetRecord
} from "@/lib/image-assets";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

const curatedSamples: Array<{
  filename: string;
  contentType: string;
  metadata: AssetMetadataInput;
}> = [
  {
    filename: "ryan-waring-geeZzrAXyMQ-unsplash.jpg",
    contentType: "image/jpeg",
    metadata: {
      title: "Blue Food Truck",
      description: "Bundled sample artwork for the Mixtape Mosaic configurator.",
      alt_text: "A blue food truck parked in front of a green building.",
      source_type: "bundled_sample",
      source_name: "Unsplash",
      source_author: "Ryan Waring",
      source_license: "Unsplash sample",
      tags: ["blue", "street", "truck"],
      categories: ["curated", "sample"],
      status: "active"
    }
  },
  {
    filename: "aishwarya-mv-3i-TsBuiTPk-unsplash.jpg",
    contentType: "image/jpeg",
    metadata: {
      title: "Sunset Palms",
      description: "Bundled sample artwork for the Mixtape Mosaic configurator.",
      alt_text: "Palm trees silhouetted against a warm orange sunset.",
      source_type: "bundled_sample",
      source_name: "Unsplash",
      source_author: "Aishwarya MV",
      source_license: "Unsplash sample",
      tags: ["sunset", "palms", "landscape"],
      categories: ["curated", "sample"],
      status: "active"
    }
  }
];

async function sampleToFile(filename: string, contentType: string) {
  const buffer = await readFile(path.join(process.cwd(), "public", "assets", filename));
  return new File([buffer], filename, { type: contentType });
}

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  try {
    const { assets: existingAssets } = await listAdminImageAssets({ limit: 96 });
    const existingBundledTitles = new Set(
      existingAssets
        .filter((asset) => asset.source_type === "bundled_sample")
        .map((asset) => asset.title)
    );
    const created: ImageAssetRecord[] = [];
    const skipped: string[] = [];

    for (const sample of curatedSamples) {
      if (existingBundledTitles.has(sample.metadata.title)) {
        skipped.push(sample.metadata.title);
        continue;
      }

      const file = await sampleToFile(sample.filename, sample.contentType);
      created.push(await createImageAssetFromUpload(file, sample.metadata));
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not seed bundled samples." },
      { status: 500 }
    );
  }
}
