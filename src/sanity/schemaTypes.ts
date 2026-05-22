export const schemaTypes = [
  {
    name: "page",
    title: "Page",
    fields: ["title", "slug", "sections[]: hero | copyBand | gallery | faq | cta"]
  },
  {
    name: "post",
    title: "Journal Post",
    fields: ["title", "slug", "volume", "excerpt", "mainImage", "publishedAt", "bodyMdx"]
  },
  {
    name: "faqItem",
    title: "FAQ Item",
    fields: ["question", "slug", "answerMdx", "sortOrder"]
  },
  {
    name: "galleryItem",
    title: "Gallery Item",
    fields: ["title", "image", "caption", "sortOrder"]
  },
  {
    name: "product",
    title: "Product",
    fields: ["title", "slug", "priceCents", "dimensions", "productionEstimate", "descriptionMdx"]
  }
];
