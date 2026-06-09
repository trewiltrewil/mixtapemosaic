import type { Metadata } from "next";
import { ArtworkLibrary } from "@/components/ArtworkLibrary";
import { SiteFooter } from "@/components/PublicChrome";
import { getArtworkCollectionPages } from "@/lib/cms";
import { searchPublicImageAssets } from "@/lib/image-assets";

export const revalidate = 86400;

type PageProps = {
  searchParams?: Promise<{ q?: string; tag?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = (await getArtworkCollectionPages()).find((collection) => collection.slug === "all");
  return {
    title: page?.seoTitle ?? "Artwork Library | Mixtape Mosaic",
    description: page?.seoDescription ?? page?.intro ?? "Browse approved artwork for custom cassette mosaic wall art.",
    alternates: { canonical: "/artwork" }
  };
}

function dailyArtworkSeed() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ArtworkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = (await getArtworkCollectionPages()).find((collection) => collection.slug === "all");
  const query = params?.q ?? "";
  const seed = dailyArtworkSeed();
  const result = await searchPublicImageAssets({ query, tag: params?.tag, seed, limit: 24, offset: 0 }).catch(() => ({
    assets: [],
    hasMore: false,
    nextOffset: 0
  }));

  return (
    <main>
      <section className="artwork-library-hero">
        <div>
          <p>{page?.eyebrow ?? "Artwork Library"}</p>
          <h1>{page?.title ?? "Artwork Library"}</h1>
        </div>
        <p>{page?.intro ?? "Discover approved artwork built for Mixtape Mosaic. Search by mood, theme, artist, color, and collection."}</p>
      </section>
      <ArtworkLibrary
        initialAssets={result.assets}
        initialHasMore={result.hasMore}
        initialNextOffset={result.nextOffset}
        initialQuery={query}
        initialSeed={seed}
        featuredTags={page?.featuredTags ?? []}
      />
      <SiteFooter />
    </main>
  );
}
