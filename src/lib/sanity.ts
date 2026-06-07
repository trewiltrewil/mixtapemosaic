import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";

export const sanityClient = createClient({
  projectId: projectId || "mixtapemosaic",
  dataset,
  apiVersion: "2026-05-22",
  useCdn: false
});

export const sanityWriteClient = createClient({
  projectId: projectId || "mixtapemosaic",
  dataset,
  apiVersion: "2026-05-22",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

export const sanityServerClient = process.env.SANITY_API_TOKEN ? sanityWriteClient : sanityClient;

const builder = createImageUrlBuilder(sanityClient);

export function sanityConfigured() {
  return Boolean(projectId);
}

export function sanityImageUrl(source: unknown, width = 1200) {
  if (!source) {
    return null;
  }

  return builder.image(source).width(width).auto("format").fit("max").url();
}
