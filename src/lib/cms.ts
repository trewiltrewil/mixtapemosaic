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
  columns: number;
  rows: number;
  aspectRatio: string;
  sortOrder: number;
};
export type CmsPage = {
  title: string;
  slug: string;
  sections: Array<Record<string, unknown> & { _type: string }>;
  seoTitle?: string;
  seoDescription?: string;
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
      title, "slug": slug.current, sections, seoTitle, seoDescription
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
      columns?: number;
      rows?: number;
      aspectRatio?: string;
      sortOrder?: number;
    }>
  >(
    `*[_type == "productVariant" && active == true && !(_id in path("drafts.**"))] | order(sortOrder asc, _createdAt asc){
      variantId, displayName, productType, priceCents, productionEstimate, customizerLayoutKey, columns, rows, aspectRatio, sortOrder
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
      layout: variant.customizerLayoutKey === "landscape" ? "landscape" : "square",
      columns: variant.columns || (variant.customizerLayoutKey === "landscape" ? 8 : 6),
      rows: variant.rows || 9,
      aspectRatio: variant.aspectRatio || (variant.customizerLayoutKey === "landscape" ? "1630 / 1254" : "1 / 1"),
      sortOrder: variant.sortOrder ?? index
    }));
});

export async function getActiveProductVariantById(id: string) {
  const variants = await getActiveProductVariants();
  return variants.find((variant) => variant.id === id) ?? null;
}
