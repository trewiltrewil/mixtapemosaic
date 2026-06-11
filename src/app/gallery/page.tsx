import type { Metadata } from "next";
import { CmsSections } from "@/components/CmsSections";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const revalidate = 86400;

const fallbackGallerySections = [
  {
    _key: "hero",
    _type: "heroSection",
    layout: "page",
    tone: "green",
    title: "Gallery",
    body: "Installed pieces, customer walls, and studio proofs from the Mixtape Mosaic archive."
  },
  {
    _key: "gallery-grid",
    _type: "gallerySection",
    columns: 3
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("gallery");
  const title = page?.seoTitle ?? "Gallery | Mixtape Mosaic";
  const description =
    page?.seoDescription ?? "See installed Mixtape Mosaic cassette wall-art pieces, studio proofs, and room inspiration.";

  return {
    title,
    description,
    keywords: page?.seoKeywords,
    robots: page?.seoNoIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: page?.seoCanonicalPath || "/gallery" },
    openGraph: {
      title,
      description,
      type: "website",
      images: page?.seoImageUrl ? [{ url: page.seoImageUrl, alt: title }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: page?.seoImageUrl ? [page.seoImageUrl] : undefined
    }
  };
}

export default async function GalleryPage() {
  const page = await getPageBySlug("gallery");
  const hasGalleryGrid = page?.sections?.some((section) => section._type === "gallerySection");

  return (
    <main>
      <CmsSections sections={hasGalleryGrid ? page?.sections : fallbackGallerySections} />
      <SiteFooter />
    </main>
  );
}
