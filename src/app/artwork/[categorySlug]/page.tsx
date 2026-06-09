import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkLibrary } from "@/components/ArtworkLibrary";
import { PageHero, SiteFooter } from "@/components/PublicChrome";
import { getArtworkCollectionPageBySlug, getArtworkCollectionPages } from "@/lib/cms";
import { searchPublicImageAssets } from "@/lib/image-assets";

export const revalidate = 86400;

type PageProps = {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<{ q?: string; tag?: string }>;
};

export async function generateStaticParams() {
  const pages = await getArtworkCollectionPages();
  return pages
    .filter((page) => page.slug !== "all" && page.slug !== "artwork")
    .map((page) => ({ categorySlug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const page = await getArtworkCollectionPageBySlug(categorySlug);
  return {
    title: page?.seoTitle ?? `${page?.title ?? "Artwork"} | Mixtape Mosaic`,
    description: page?.seoDescription ?? page?.intro ?? "Browse Mixtape Mosaic artwork.",
    alternates: { canonical: `/artwork/${categorySlug}` }
  };
}

function dailyArtworkSeed() {
  return new Date().toISOString().slice(0, 10);
}

function isMainArtworkPage(slug: string) {
  return slug === "all" || slug === "artwork";
}

export default async function ArtworkCategoryPage({ params, searchParams }: PageProps) {
  const [{ categorySlug }, queryParams] = await Promise.all([params, searchParams]);
  const [page, collections] = await Promise.all([
    getArtworkCollectionPageBySlug(categorySlug),
    getArtworkCollectionPages()
  ]);
  if (!page) {
    notFound();
  }
  const mainPage = collections.find((collection) => isMainArtworkPage(collection.slug));

  const query = queryParams?.q ?? "";
  const seed = dailyArtworkSeed();
  const result = await searchPublicImageAssets({
    query,
    tag: queryParams?.tag,
    category: page.categoryKey,
    seed,
    limit: 24,
    offset: 0
  }).catch(() => ({
    assets: [],
    hasMore: false,
    nextOffset: 0
  }));

  return (
    <main>
      <PageHero
        title={page.title}
        kicker={page.intro ?? "Browse approved artwork built for Mixtape Mosaic."}
      />
      <ArtworkLibrary
        initialAssets={result.assets}
        initialHasMore={result.hasMore}
        initialNextOffset={result.nextOffset}
        initialQuery={query}
        initialSeed={seed}
        category={page.categoryKey}
        activeCollectionSlug={page.slug}
        collections={collections}
        storyHeading={page.contentHeading ?? page.seoTitle ?? null}
        storyBody={page.contentBody ?? page.seoDescription ?? null}
        featuredTags={mainPage?.featuredTags ?? []}
      />
      <SiteFooter />
    </main>
  );
}
