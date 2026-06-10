import { cache } from "react";
import { fallbackFaqItems, fallbackGalleryItems, fallbackJournalPosts, fallbackProductVariantList } from "./fallback-content";
import { sanityConfigured, sanityImageUrl, sanityServerClient } from "./sanity";

export const cmsRevalidateSeconds = 86400;

export type CmsGalleryItem = (typeof fallbackGalleryItems)[number];
export type CmsJournalPost = (typeof fallbackJournalPosts)[number] & {
  author?: string;
  publishedAt?: string;
  bodyMdx?: string;
  mainImageAlt?: string;
};
export type CmsFaqItem = (typeof fallbackFaqItems)[number];
export type CmsProductVariant = {
  id: string;
  label: string;
  productType: string;
  priceCents: number;
  productionEstimate: string;
  layout: string;
  mockupPhoto?: {
    src: string;
    width: number;
    height: number;
  };
  columns: number;
  rows: number;
  panelColumns: number;
  panelRows: number;
  panelCount: number;
  tapeCountLabel: string;
  aspectRatio: string;
  sortOrder: number;
};
export type CmsArtworkCollectionPage = {
  title: string;
  slug: string;
  categoryKey?: string;
  eyebrow?: string;
  intro?: string;
  contentHeading?: string;
  contentBody?: string;
  featuredTags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  seoKeywords?: string[];
  seoCanonicalPath?: string;
  seoNoIndex?: boolean;
};
export type CmsPage = {
  title: string;
  slug: string;
  sections: Array<Record<string, unknown> & { _type: string }>;
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  seoKeywords?: string[];
  seoCanonicalPath?: string;
  seoNoIndex?: boolean;
};
export type CmsSiteSettings = {
  title?: string;
  footerBody?: string;
  newsletterBody?: string;
  marqueeText?: string;
  navItems?: Array<{ label: string; href: string }>;
  socialLinks?: Array<{ label: string; href: string }>;
};

async function fetchSanity<T>(query: string, params: Record<string, unknown> = {}) {
  if (!sanityConfigured()) {
    return null;
  }

  try {
    return await sanityServerClient.fetch<T>(query, params, {
      next: { revalidate: cmsRevalidateSeconds, tags: ["sanity"] }
    });
  } catch {
    return null;
  }
}

export const getSiteSettings = cache(async (): Promise<CmsSiteSettings | null> => {
  return fetchSanity<CmsSiteSettings>(
    `*[_type == "siteSettings"][0]{
      title, footerBody, newsletterBody, marqueeText, navItems, socialLinks
    }`
  );
});

export const getPageBySlug = cache(async (slug: string): Promise<CmsPage | null> => {
  return fetchSanity<CmsPage>(
    `*[_type == "page" && slug.current == $slug][0]{
      title, "slug": slug.current, sections,
      seoTitle, seoDescription, "seoImageUrl": seoImage.asset->url, seoKeywords, seoCanonicalPath, seoNoIndex
    }`,
    { slug }
  );
});

export const getGalleryItems = cache(async (): Promise<CmsGalleryItem[]> => {
  const items = await fetchSanity<
    Array<{
      title: string;
      projectType?: string;
      image?: unknown;
      alt?: string;
      caption?: string;
    }>
  >(
    `*[_type == "galleryItem" && active == true] | order(sortOrder asc, _createdAt desc){
      title, projectType, image, alt, caption
    }`
  );

  if (!items?.length) {
    return fallbackGalleryItems;
  }

  return items.map((item) => ({
    title: item.title,
    size: item.projectType || item.caption || "Mixtape Mosaic",
    src: sanityImageUrl(item.image, 1200) ?? fallbackGalleryItems[0].src,
    alt: item.alt || item.title
  }));
});

export const getJournalPosts = cache(async (): Promise<CmsJournalPost[]> => {
  const posts = await fetchSanity<
    Array<{
      title: string;
      slug?: string;
      volume?: string;
      excerpt?: string;
      author?: string;
      publishedAt?: string;
      mainImage?: unknown;
      mainImageAlt?: string;
      bodyMdx?: string;
    }>
  >(
    `*[_type == "journalPost" && active == true] | order(publishedAt desc, _createdAt desc){
      title, "slug": slug.current, volume, excerpt, author, publishedAt, mainImage, mainImageAlt, bodyMdx
    }`
  );

  if (!posts?.length) {
    return fallbackJournalPosts;
  }

  const colors = ["bg-primary", "bg-secondary", "bg-accent"] as const;
  return posts.map((post, index) => ({
    title: post.title,
    slug: post.slug || "",
    volume: post.volume || `Vol. ${String(posts.length - index).padStart(2, "0")}`,
    excerpt: post.excerpt || "",
    author: post.author || "Studio Team",
    publishedAt: post.publishedAt,
    bodyMdx: post.bodyMdx,
    mainImageAlt: post.mainImageAlt,
    src: sanityImageUrl(post.mainImage, 1200) ?? fallbackJournalPosts[index % fallbackJournalPosts.length].src,
    color: colors[index % colors.length],
    href: `/journal/${post.slug || ""}`
  }));
});

export const getJournalPostBySlug = cache(async (slug: string): Promise<CmsJournalPost | null> => {
  const posts = await getJournalPosts();
  return posts.find((post) => post.slug === slug) ?? null;
});

export const getFaqItems = cache(async (): Promise<CmsFaqItem[]> => {
  const items = await fetchSanity<Array<{ question: string; slug?: string; answerMdx?: string }>>(
    `*[_type == "faqItem" && active == true] | order(sortOrder asc, _createdAt asc){
      question, "slug": slug.current, answerMdx
    }`
  );

  if (!items?.length) {
    return fallbackFaqItems;
  }

  return items.map((item) => ({
    id: item.slug || item.question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    question: item.question,
    answer: item.answerMdx || ""
  }));
});

export const getActiveProductVariants = cache(async (): Promise<CmsProductVariant[]> => {
  const variants = await fetchSanity<
    Array<{
      variantId: string;
      displayName: string;
      productType: string;
      priceCents: number;
      productionEstimate?: string;
      customizerLayoutKey?: string;
      mockupImage?: unknown;
      mockupImageUrl?: string;
      mockupImageWidth?: number;
      mockupImageHeight?: number;
      columns?: number;
      rows?: number;
      panelColumns?: number;
      panelRows?: number;
      panelCount?: number;
      tapeCountLabel?: string;
      aspectRatio?: string;
      sortOrder?: number;
    }>
  >(
    `*[_type == "productVariant" && active == true && !(_id in path("drafts.**"))] | order(sortOrder asc, _createdAt asc){
      variantId, displayName, productType, priceCents, productionEstimate, customizerLayoutKey, columns, rows,
      panelColumns, panelRows, panelCount, tapeCountLabel, aspectRatio, sortOrder,
      mockupImage, "mockupImageUrl": mockupImage.asset->url,
      "mockupImageWidth": mockupImage.asset->metadata.dimensions.width,
      "mockupImageHeight": mockupImage.asset->metadata.dimensions.height
    }`
  );

  if (!variants?.length) {
    return fallbackProductVariantList;
  }

  return variants
    .filter((variant) => variant.variantId && variant.displayName && variant.productType && Number.isFinite(variant.priceCents))
    .map((variant, index) => ({
      id: variant.variantId,
      label: variant.displayName,
      productType: variant.productType,
      priceCents: variant.priceCents,
      productionEstimate: variant.productionEstimate || "Ships in 2-3 weeks",
      layout: variant.customizerLayoutKey || "square",
      mockupPhoto: variant.mockupImageUrl
        ? {
            src: sanityImageUrl(variant.mockupImage, variant.mockupImageWidth || 1600) ?? variant.mockupImageUrl,
            width: variant.mockupImageWidth || 1200,
            height: variant.mockupImageHeight || 1200
          }
        : undefined,
      columns: variant.columns || (variant.customizerLayoutKey === "landscape" ? 8 : 6),
      rows: variant.rows || 9,
      panelColumns: variant.panelColumns || (variant.customizerLayoutKey === "landscape" ? 4 : variant.customizerLayoutKey === "portrait" ? 3 : 3),
      panelRows: variant.panelRows || (variant.customizerLayoutKey === "landscape" ? 3 : variant.customizerLayoutKey === "portrait" ? 4 : 3),
      panelCount:
        variant.panelCount ||
        (variant.panelColumns && variant.panelRows ? variant.panelColumns * variant.panelRows : variant.customizerLayoutKey === "landscape" ? 12 : variant.customizerLayoutKey === "portrait" ? 12 : 9),
      tapeCountLabel: variant.tapeCountLabel || `${(variant.columns || (variant.customizerLayoutKey === "landscape" ? 8 : 6)) * (variant.rows || 9)} tapes`,
      aspectRatio: variant.aspectRatio || (variant.customizerLayoutKey === "landscape" ? "1630 / 1254" : "1 / 1"),
      sortOrder: variant.sortOrder ?? index
    }));
});

export async function getActiveProductVariantById(id: string) {
  const variants = await getActiveProductVariants();
  return variants.find((variant) => variant.id === id) ?? null;
}

export const getArtworkCollectionPages = cache(async (): Promise<CmsArtworkCollectionPage[]> => {
  const pages = await fetchSanity<CmsArtworkCollectionPage[]>(
    `*[_type == "artworkCollectionPage" && active == true && !(_id in path("drafts.**"))] | order(title asc){
      title, "slug": slug.current, categoryKey, eyebrow, intro, contentHeading, contentBody, featuredTags,
      seoTitle, seoDescription, "seoImageUrl": seoImage.asset->url, seoKeywords, seoCanonicalPath, seoNoIndex
    }`
  );

  return pages?.length
    ? pages
    : [
        {
          title: "Artwork Library",
          slug: "all",
          eyebrow: "Artwork Library",
          intro:
            "Discover approved artwork built for Mixtape Mosaic. Search by mood, theme, artist, color, and collection.",
          contentHeading: "Curated Wall Art For The Analog Soul",
          contentBody:
            "Our artwork library represents hundreds of hours of curation, collaboration, and exploration. Filter by collection, search by mood, and find the visual anchor for your custom cassette mosaic.",
          featuredTags: ["retro", "music", "color", "landscape"],
          seoTitle: "Artwork Library | Mixtape Mosaic",
          seoDescription: "Browse cassette mosaic artwork options by collection, mood, and theme."
        },
        {
          title: "Curated",
          slug: "curated",
          categoryKey: "curated",
          eyebrow: "Collection",
          intro: "A rotating set of studio-selected artwork ready to customize into a cassette mosaic.",
          contentHeading: "Studio Picks Ready For The Wall",
          contentBody: "These are the pieces we keep coming back to: strong color, clear composition, and enough analog character to feel alive across real cassette tapes.",
          featuredTags: ["vintage", "music", "color"]
        },
        {
          title: "Analog Reveal",
          slug: "analog-reveal",
          categoryKey: "analog reveal",
          eyebrow: "Collection",
          intro:
            "Artwork designed to let the cassette shells, holes, labels, and analog texture remain part of the final piece.",
          contentHeading: "Let The Tapes Stay In The Story",
          contentBody:
            "Analog reveal artwork is tuned so the cassette grid remains visible through the final image, giving each piece a raw, material-forward look.",
          featuredTags: ["transparent", "texture", "cassette"]
        },
        {
          title: "Retro",
          slug: "retro",
          categoryKey: "retro",
          eyebrow: "Collection",
          intro: "Bold, nostalgic artwork with color, shape, and visual rhythm built for tape-grid wall art.",
          contentHeading: "Color, Rhythm, And Throwback Energy",
          contentBody: "Retro artwork leans into graphic shapes, saturated palettes, and visual references that feel right at home on a wall of vintage tapes.",
          featuredTags: ["neon", "arcade", "pop"]
        },
        {
          title: "1 of 1s",
          slug: "limited-runs",
          categoryKey: "1of1s",
          eyebrow: "Collection",
          intro: "Limited-run artwork drops for collectors who want something with a little more rarity.",
          contentHeading: "Small Runs With Collector Energy",
          contentBody: "One-of-one and limited pieces are built for people who want the artwork to feel less like a catalog choice and more like a find.",
          featuredTags: ["limited", "artist", "drop"]
        }
      ];
});

export const getArtworkCollectionPageBySlug = cache(async (slug: string) => {
  const pages = await getArtworkCollectionPages();
  return pages.find((page) => page.slug === slug) ?? null;
});
