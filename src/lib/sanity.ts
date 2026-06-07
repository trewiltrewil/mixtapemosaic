import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "mixtapemosaic",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2026-05-22",
  useCdn: true
});

export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "mixtapemosaic",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2026-05-22",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

const builder = createImageUrlBuilder(sanityClient);

export function sanityConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET);
}

export function sanityImageUrl(source: unknown, width = 1200) {
  if (!source) {
    return null;
  }

  return builder.image(source).width(width).auto("format").fit("max").url();
}
