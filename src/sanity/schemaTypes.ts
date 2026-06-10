import { defineArrayMember, defineField, defineType } from "sanity";

const mdxField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "text",
    rows: 14,
    description: "MDX content rendered through the approved Mixtape Mosaic component registry."
  });

const seoFields = [
  defineField({ name: "seoTitle", title: "SEO title", type: "string" }),
  defineField({ name: "seoDescription", title: "SEO description", type: "text", rows: 3 }),
  defineField({
    name: "seoImage",
    title: "SEO / social image",
    type: "image",
    options: { hotspot: true },
    description: "Used for Open Graph and social sharing previews. Keep visible page artwork/content separate."
  }),
  defineField({
    name: "seoKeywords",
    title: "SEO keywords",
    type: "array",
    of: [defineArrayMember({ type: "string" })],
    description: "Optional comma-like keyword list for metadata."
  }),
  defineField({
    name: "seoCanonicalPath",
    title: "Canonical path",
    type: "string",
    description: "Optional canonical URL path, for example /artwork or /artwork/retro."
  }),
  defineField({
    name: "seoNoIndex",
    title: "Hide from search engines",
    type: "boolean",
    initialValue: false,
    description: "Adds noindex/nofollow metadata when enabled."
  })
];

const enabledField = defineField({ name: "enabled", title: "Show section", type: "boolean", initialValue: true });

const sectionMembers = [
  defineArrayMember({
    name: "heroSection",
    title: "Hero",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "kicker", type: "string" }),
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "body", type: "text", rows: 3 }),
      defineField({ name: "ctaLabel", title: "CTA label", type: "string" }),
      defineField({ name: "ctaHref", title: "CTA href", type: "string" }),
      defineField({ name: "image", type: "image", options: { hotspot: true } }),
      defineField({ name: "imageAlt", title: "Image alt text", type: "string" }),
      defineField({
        name: "tone",
        type: "string",
        options: { list: ["yellow", "dark", "orange", "muted"] },
        initialValue: "yellow"
      })
    ]
  }),
  defineArrayMember({
    name: "copyBandSection",
    title: "Copy band",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "kicker", type: "string" }),
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      mdxField("bodyMdx", "Body"),
      defineField({ name: "image", type: "image", options: { hotspot: true } }),
      defineField({ name: "imageAlt", title: "Image alt text", type: "string" }),
      defineField({ name: "ctaLabel", title: "CTA label", type: "string" }),
      defineField({ name: "ctaHref", title: "CTA href", type: "string" })
    ]
  }),
  defineArrayMember({
    name: "processStepsSection",
    title: "Process steps",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "title", type: "string" }),
      defineField({
        name: "steps",
        type: "array",
        of: [
          defineArrayMember({
            type: "object",
            fields: [
              defineField({ name: "label", type: "string" }),
              defineField({ name: "title", type: "string" }),
              defineField({ name: "body", type: "text", rows: 4 }),
              defineField({ name: "image", type: "image", options: { hotspot: true } }),
              defineField({ name: "imageAlt", title: "Image alt text", type: "string" })
            ]
          })
        ]
      })
    ]
  }),
  defineArrayMember({
    name: "wallPresenceSection",
    title: "Wall presence image collage",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "kicker", type: "string", initialValue: "Wall Presence" }),
      defineField({ name: "title", type: "string", initialValue: "More than a print." }),
      defineField({ name: "body", type: "text", rows: 4 }),
      defineField({ name: "tallImage", type: "image", options: { hotspot: true } }),
      defineField({ name: "tallImageAlt", title: "Tall image alt text", type: "string" }),
      defineField({ name: "topImage", type: "image", options: { hotspot: true } }),
      defineField({ name: "topImageAlt", title: "Top image alt text", type: "string" }),
      defineField({ name: "bottomImage", type: "image", options: { hotspot: true } }),
      defineField({ name: "bottomImageAlt", title: "Bottom image alt text", type: "string" })
    ]
  }),
  defineArrayMember({
    name: "galleryPreviewSection",
    title: "Gallery preview",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "title", type: "string", initialValue: "Gallery" }),
      defineField({ name: "body", type: "string" }),
      defineField({ name: "limit", type: "number", initialValue: 3 })
    ]
  }),
  defineArrayMember({
    name: "journalPreviewSection",
    title: "Journal preview",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "title", type: "string", initialValue: "Liner Notes" }),
      defineField({ name: "body", type: "string" }),
      defineField({ name: "limit", type: "number", initialValue: 3 })
    ]
  }),
  defineArrayMember({
    name: "faqPreviewSection",
    title: "FAQ preview",
    type: "object",
    fields: [
      enabledField,
      defineField({
        name: "showOnHomepage",
        title: "Show on homepage",
        type: "boolean",
        initialValue: false,
        description: "Homepage add-on section. Off by default so the public homepage keeps the original launch structure."
      }),
      defineField({ name: "title", type: "string", initialValue: "FAQ" }),
      defineField({ name: "limit", type: "number", initialValue: 6 })
    ]
  }),
  defineArrayMember({
    name: "customizerSection",
    title: "Customizer embed",
    type: "object",
    fields: [
      enabledField,
      defineField({ name: "title", type: "string", initialValue: "Build Your Mosaic" }),
      defineField({ name: "subtitle", type: "string", initialValue: "Design a one-of-a-kind masterpiece." })
    ]
  }),
  defineArrayMember({
    name: "ctaSection",
    title: "CTA",
    type: "object",
    fields: [
      enabledField,
      defineField({
        name: "showOnHomepage",
        title: "Show on homepage",
        type: "boolean",
        initialValue: false,
        description: "Homepage add-on section. Off by default so the public homepage keeps the original launch structure."
      }),
      defineField({ name: "title", type: "string" }),
      defineField({ name: "body", type: "text", rows: 3 }),
      defineField({ name: "ctaLabel", title: "CTA label", type: "string" }),
      defineField({ name: "ctaHref", title: "CTA href", type: "string" })
    ]
  })
];

export const schemaTypes = [
  defineType({
    name: "siteSettings",
    title: "Site Settings",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", initialValue: "Mixtape Mosaic" }),
      defineField({ name: "footerBody", title: "Footer body", type: "text", rows: 3 }),
      defineField({ name: "newsletterBody", title: "Newsletter body", type: "text", rows: 2 }),
      defineField({ name: "marqueeText", title: "Marquee text", type: "string" }),
      defineField({
        name: "navItems",
        title: "Navigation",
        type: "array",
        of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", type: "string" }), defineField({ name: "href", type: "string" })] })]
      }),
      defineField({
        name: "socialLinks",
        title: "Social links",
        type: "array",
        of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", type: "string" }), defineField({ name: "href", type: "url" })] })]
      }),
      ...seoFields
    ],
    preview: { select: { title: "title" } }
  }),
  defineType({
    name: "page",
    title: "Page",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
      defineField({ name: "sections", type: "array", of: sectionMembers }),
      ...seoFields
    ]
  }),
  defineType({
    name: "journalPost",
    title: "Journal Post",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
      defineField({ name: "volume", type: "string" }),
      defineField({ name: "excerpt", type: "text", rows: 3 }),
      defineField({ name: "author", type: "string", initialValue: "Studio Team" }),
      defineField({ name: "publishedAt", type: "datetime" }),
      defineField({ name: "mainImage", type: "image", options: { hotspot: true } }),
      defineField({ name: "mainImageAlt", title: "Main image alt text", type: "string" }),
      mdxField("bodyMdx", "Body MDX"),
      defineField({ name: "active", type: "boolean", initialValue: true }),
      ...seoFields
    ]
  }),
  defineType({
    name: "faqItem",
    title: "FAQ Item",
    type: "document",
    fields: [
      defineField({ name: "question", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "slug", type: "slug", options: { source: "question" }, validation: (rule) => rule.required() }),
      mdxField("answerMdx", "Answer MDX"),
      defineField({ name: "category", type: "string" }),
      defineField({ name: "sortOrder", type: "number", initialValue: 0 }),
      defineField({ name: "active", type: "boolean", initialValue: true })
    ]
  }),
  defineType({
    name: "galleryItem",
    title: "Gallery Item",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "projectType", title: "Project type", type: "string" }),
      defineField({ name: "image", type: "image", options: { hotspot: true }, validation: (rule) => rule.required() }),
      defineField({ name: "alt", title: "Image alt text", type: "string" }),
      defineField({ name: "caption", type: "text", rows: 3 }),
      defineField({ name: "sortOrder", type: "number", initialValue: 0 }),
      defineField({ name: "active", type: "boolean", initialValue: true })
    ]
  }),
  defineType({
    name: "product",
    title: "Product",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
      defineField({ name: "descriptionMdx", title: "Description MDX", type: "text", rows: 8 }),
      defineField({ name: "active", type: "boolean", initialValue: true })
    ]
  }),
  defineType({
    name: "productVariant",
    title: "Product Variant",
    type: "document",
    fields: [
      defineField({ name: "product", type: "reference", to: [{ type: "product" }] }),
      defineField({ name: "variantId", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "displayName", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "dimensions", type: "string" }),
      defineField({ name: "priceCents", type: "number", validation: (rule) => rule.required().min(1) }),
      defineField({ name: "productType", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "productionEstimate", type: "string", initialValue: "Ships in 2-3 weeks" }),
      defineField({ name: "customizerLayoutKey", type: "string", options: { list: ["square", "landscape", "portrait"] } }),
      defineField({ name: "columns", type: "number", initialValue: 6 }),
      defineField({ name: "rows", type: "number", initialValue: 9 }),
      defineField({ name: "panelColumns", title: "Panel columns", type: "number", initialValue: 3 }),
      defineField({ name: "panelRows", title: "Panel rows", type: "number", initialValue: 3 }),
      defineField({ name: "panelCount", title: "Panel count", type: "number", initialValue: 9 }),
      defineField({ name: "tapeCountLabel", title: "Tape count label", type: "string", initialValue: "54 tapes" }),
      defineField({ name: "aspectRatio", type: "string", initialValue: "1 / 1" }),
      defineField({ name: "sortOrder", type: "number", initialValue: 0 }),
      defineField({ name: "active", type: "boolean", initialValue: true })
    ]
  }),
  defineType({
    name: "artworkCollectionPage",
    title: "Artwork Collection Page",
    type: "document",
    fields: [
      defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
      defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
      defineField({
        name: "categoryKey",
        title: "Image asset category key",
        type: "string",
        description: "Filters approved image_assets by category. Example: analog reveal, retro, curated."
      }),
      defineField({ name: "eyebrow", type: "string", initialValue: "Artwork Library" }),
      defineField({ name: "intro", type: "text", rows: 5 }),
      defineField({
        name: "contentHeading",
        title: "Story section heading",
        type: "string",
        description: "Optional heading for the editorial copy below the artwork filters."
      }),
      defineField({
        name: "contentBody",
        title: "Story section body",
        type: "text",
        rows: 7,
        description: "Optional supporting copy below the filters/search area."
      }),
      defineField({
        name: "featuredTags",
        title: "Featured tag filters",
        type: "array",
        of: [defineArrayMember({ type: "string" })]
      }),
      defineField({ name: "active", type: "boolean", initialValue: true }),
      ...seoFields
    ],
    preview: { select: { title: "title", subtitle: "categoryKey" } }
  })
];
