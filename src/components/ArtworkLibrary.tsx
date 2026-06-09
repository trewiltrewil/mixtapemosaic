"use client";

import Link from "next/link";
import { Search, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ArtworkLibraryAsset = {
  id: string;
  title: string;
  description: string | null;
  alt_text: string | null;
  source_author: string | null;
  source_name: string | null;
  thumb_url: string | null;
  card_url: string | null;
  preview_url: string | null;
  large_url: string | null;
  cassette_thumb_url: string | null;
  tags: string[];
  categories: string[];
};

type ArtworkResponse = {
  assets?: ArtworkLibraryAsset[];
  hasMore?: boolean;
  nextOffset?: number;
};

type ArtworkCollectionLink = {
  title: string;
  slug: string;
  categoryKey?: string;
};

function artist(asset: ArtworkLibraryAsset) {
  return asset.source_author || asset.source_name || "Mixtape Mosaic";
}

function image(asset: ArtworkLibraryAsset) {
  return asset.cassette_thumb_url ?? asset.thumb_url ?? asset.card_url ?? asset.preview_url ?? asset.large_url;
}

function uniqueFeaturedTags(featured: string[]) {
  return Array.from(new Set(featured.map((tag) => tag.trim()).filter(Boolean))).slice(0, 14);
}

function collectionRank(collection: ArtworkCollectionLink) {
  if (collection.slug === "all" || collection.slug === "artwork") return 0;
  if (collection.slug === "curated") return 1;
  if (collection.slug === "analog-reveal") return 2;
  if (collection.slug === "retro") return 3;
  if (collection.slug === "limited-runs") return 4;
  return 20;
}

export function ArtworkLibrary({
  initialAssets,
  initialHasMore,
  initialNextOffset,
  initialQuery = "",
  initialSeed,
  category,
  activeCollectionSlug = "all",
  collections = [],
  storyHeading,
  storyBody,
  featuredTags = []
}: {
  initialAssets: ArtworkLibraryAsset[];
  initialHasMore: boolean;
  initialNextOffset: number;
  initialQuery?: string;
  initialSeed: string;
  category?: string | null;
  activeCollectionSlug?: string;
  collections?: ArtworkCollectionLink[];
  storyHeading?: string | null;
  storyBody?: string | null;
  featuredTags?: string[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [query, setQuery] = useState(initialQuery);
  const [activeTag, setActiveTag] = useState("");
  const [seed, setSeed] = useState(initialSeed);
  const [offset, setOffset] = useState(initialNextOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const tags = uniqueFeaturedTags(featuredTags);
  const collectionLinks = [...collections].sort(
    (a, b) => collectionRank(a) - collectionRank(b) || a.title.localeCompare(b.title)
  );

  async function fetchAssets({ reset = false, nextOffset = offset, nextQuery = query, nextTag = activeTag } = {}) {
    setLoading(true);
    const params = new URLSearchParams({ limit: "24", offset: String(reset ? 0 : nextOffset) });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (category) params.set("category", category);
    if (nextTag) params.set("tag", nextTag);
    if (seed) params.set("seed", seed);

    const response = await fetch(`/api/images?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const payload = response?.ok ? ((await response.json()) as ArtworkResponse) : null;
    const nextAssets = payload?.assets ?? [];
    setAssets((current) => (reset ? nextAssets : [...current, ...nextAssets]));
    setOffset(payload?.nextOffset ?? (reset ? nextAssets.length : nextOffset + nextAssets.length));
    setHasMore(Boolean(payload?.hasMore));
    setLoading(false);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchAssets({ reset: true, nextQuery: query, nextTag: activeTag });
    }, 260);
    return () => window.clearTimeout(handle);
  }, [query, activeTag, category, seed]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading) {
        void fetchAssets();
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, offset, query, activeTag, category, seed]);

  function shuffleArtwork() {
    setSeed(`crate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  return (
    <section className="artwork-library-section">
      <div className="artwork-library-tools">
        <div className="artwork-library-filter-row">
          <div className="artwork-tag-row" aria-label="Artwork collections">
            {collectionLinks.length ? (
              collectionLinks.map((collection) => (
                <Link
                  key={collection.slug}
                  href={collection.slug === "all" || collection.slug === "artwork" ? "/artwork" : `/artwork/${collection.slug}`}
                  className={!activeTag && activeCollectionSlug === collection.slug ? "selected" : ""}
                >
                  {collection.slug === "all" || collection.slug === "artwork" ? "All" : collection.title}
                </Link>
              ))
            ) : (
              <button type="button" className={!activeTag ? "selected" : ""} onClick={() => setActiveTag("")}>
                All
              </button>
            )}
            {tags.map((tag) => (
              <button key={tag} type="button" className={activeTag === tag ? "selected" : ""} onClick={() => setActiveTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
          <div className="artwork-library-search-actions">
            <div className="artwork-search-field">
              <Search className="w-5 h-5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search themes, artists..."
                aria-label="Search artwork"
              />
            </div>
            <button type="button" className="artwork-shuffle-button" onClick={shuffleArtwork}>
              <Shuffle className="w-4 h-4" />
              Shuffle the Stack
            </button>
          </div>
        </div>
        {storyHeading || storyBody ? (
          <div className="artwork-library-story">
            {storyHeading ? <h2>{storyHeading}</h2> : null}
            {storyBody ? <p>{storyBody}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="artwork-library-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="artwork-library-card">
            <div className="artwork-library-image">
              {image(asset) ? <img src={image(asset) ?? ""} alt={asset.alt_text ?? asset.title} loading="lazy" /> : null}
              <div>
                {[...(asset.categories ?? [])].slice(0, 3).map((categoryName) => (
                  <span key={categoryName}>{categoryName}</span>
                ))}
              </div>
            </div>
            <div className="artwork-library-card-body">
              <h2>{asset.title}</h2>
              <p>Artist: {artist(asset)}</p>
              <div>
                {(asset.tags ?? []).slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <Link className="artwork-library-cta" href={`/customize?artwork=${asset.id}`}>
                Customize This Design →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {!assets.length && !loading ? (
        <p className="artwork-empty">No matching artwork yet. Try a broader mood, color, artist, or subject.</p>
      ) : null}
      <div ref={sentinelRef} className="artwork-sentinel">
        {loading ? "Loading more artwork..." : hasMore ? "Scroll for more" : "End of the crate"}
      </div>
    </section>
  );
}
