import { NextResponse } from "next/server";
import { sanityConfigured, sanityWriteClient } from "@/lib/sanity";
import { isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin password required." }, { status: 401 });
  }

  const env = {
    hasProjectId: Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production",
    hasReadConfig: sanityConfigured(),
    hasToken: Boolean(process.env.SANITY_API_TOKEN),
    hasRevalidateSecret: Boolean(process.env.SANITY_REVALIDATE_SECRET)
  };

  try {
    const status = await sanityWriteClient.fetch<{
      pages: Array<{ _id: string; title?: string; slug?: string; sectionCount?: number; updatedAt?: string }>;
      faqCount: number;
      galleryCount: number;
      journalCount: number;
      productVariantCount: number;
    }>(
      `{
        "pages": *[_type == "page" && slug.current in ["home", "process", "customize", "gallery", "contact"]]{
          _id,
          title,
          "slug": slug.current,
          "sectionCount": count(sections),
          "updatedAt": _updatedAt
        },
        "faqCount": count(*[_type == "faqItem" && active == true && !(_id in path("drafts.**"))]),
        "galleryCount": count(*[_type == "galleryItem" && active == true && !(_id in path("drafts.**"))]),
        "journalCount": count(*[_type == "journalPost" && active == true && !(_id in path("drafts.**"))]),
        "productVariantCount": count(*[_type == "productVariant" && active == true && !(_id in path("drafts.**"))])
      }`
    );

    return NextResponse.json({ env, status });
  } catch (error) {
    return NextResponse.json(
      {
        env,
        error: error instanceof Error ? error.message : "Could not query Sanity."
      },
      { status: 500 }
    );
  }
}
