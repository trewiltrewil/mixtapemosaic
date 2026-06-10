import type { Metadata } from "next";
import { ArtworkLibrary } from "@/components/ArtworkLibrary";
import { PageHero, SiteFooter } from "@/components/PublicChrome";
import { getArtworkCollectionPages, type CmsArtworkCollectionPage } from "@/lib/cms";
import { searchPublicImageAssets } from "@/lib/image-assets";

export const revalidate = 86400;

type PageProps = {
  searchParams?: Promise<{ q?: string; tag?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = (await getArtworkCollectionPages()).find(
    (collection) => collection.slug === "all" || collection.slug === "artwork"
  );
  const title = page?.seoTitle ?? "Artwork Library | Mixtape Mosaic";
  const description = page?.seoDescription ?? page?.intro ?? "Browse approved artwork for custom cassette mosaic wall art.";

  return artworkMetadata(page, title, description, "/artwork");
}

function artworkMetadata(
  page: CmsArtworkCollectionPage | undefined,
  title: string,
  description: string,
  fallbackCanonical: string
): Metadata {
  const imageUrl = page?.seoImageUrl;
  return {
    title,
    description,
    keywords: page?.seoKeywords,
    robots: page?.seoNoIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: page?.seoCanonicalPath || fallbackCanonical },
    openGraph: {
      title,
      description,
      type: "website",
      images: imageUrl ? [{ url: imageUrl, alt: title }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

function dailyArtworkSeed() {
  return new Date().toISOString().slice(0, 10);
}

function isMainArtworkPage(slug: string) {
  return slug === "all" || slug === "artwork";
}

export default async function ArtworkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const collections = await getArtworkCollectionPages();
  const page = collections.find((collection) => isMainArtworkPage(collection.slug));
  const query = params?.q ?? "";
  const seed = dailyArtworkSeed();
  const result = await searchPublicImageAssets({ query, tag: params?.tag, seed, limit: 24, offset: 0 }).catch(() => ({
    assets: [],
    hasMore: false,
    nextOffset: 0
  }));

  return (
    <main>
      <PageHero
        title={page?.title ?? "Artwork Library"}
        kicker={
          page?.intro ??
          "Discover the perfect piece for your mosaic. Browse hundreds of curated prints, limited drops, and analog reveals."
        }
      />
      <ArtworkLibrary
        initialAssets={result.assets}
        initialHasMore={result.hasMore}
        initialNextOffset={result.nextOffset}
        initialQuery={query}
        initialSeed={seed}
        activeCollectionSlug={page?.slug ?? "all"}
        collections={collections}
        storyHeading={page?.contentHeading ?? null}
        storyBody={page?.contentBody ?? null}
        featuredTags={page?.featuredTags ?? []}
      />
      <SiteFooter />
    </main>
  );
}
