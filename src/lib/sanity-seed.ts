import { readFile } from "node:fs/promises";
import path from "node:path";
import { fallbackFaqItems, fallbackGalleryItems, fallbackJournalPosts, fallbackProductVariantList } from "./fallback-content";
import { sanityWriteClient } from "./sanity";

type SanityImageRef = {
  _type: "image";
  asset: {
    _type: "reference";
    _ref: string;
  };
};

const navItems = [
  { _key: "shop", label: "Shop", href: "/customize" },
  { _key: "process", label: "Process", href: "/process" },
  { _key: "gallery", label: "Gallery", href: "/gallery" },
  { _key: "journal", label: "Journal", href: "/journal" },
  { _key: "faq", label: "FAQ", href: "/faq" }
];

const socialLinks = [
  { _key: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
  { _key: "twitter", label: "Twitter", href: "https://twitter.com/" },
  { _key: "pinterest", label: "Pinterest", href: "https://www.pinterest.com/" }
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function publicAssetPath(src: string) {
  return path.join(process.cwd(), "public", src.replace(/^\//, ""));
}

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function documentExists(id: string) {
  return Boolean(await sanityWriteClient.getDocument(id));
}

async function uploadPublicImage(src: string, title: string): Promise<SanityImageRef | undefined> {
  try {
    const filename = path.basename(src);
    const buffer = await readFile(publicAssetPath(src));
    const asset = await sanityWriteClient.assets.upload("image", buffer, {
      filename,
      contentType: contentTypeFor(filename),
      title
    });

    return {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: asset._id
      }
    };
  } catch {
    return undefined;
  }
}

async function createIfMissing(id: string, document: Record<string, unknown> & { _type: string }) {
  if (await documentExists(id)) {
    return { id, status: "skipped" as const };
  }

  await sanityWriteClient.createIfNotExists({ _id: id, ...document });
  return { id, status: "created" as const };
}

function pageDocument(slug: string, title: string, sections: Array<Record<string, unknown>>) {
  return {
    _type: "page",
    title,
    slug: { _type: "slug", current: slug },
    sections,
    seoTitle: title,
    seoDescription: "Custom cassette wall art made from real vintage tapes."
  };
}

export async function seedSanityStarterContent() {
  if (!process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN is not configured.");
  }

  const results: Array<{ id: string; status: "created" | "skipped" }> = [];

  results.push(
    await createIfMissing("siteSettings", {
      _type: "siteSettings",
      title: "Mixtape Mosaic",
      footerBody: "Turning vintage sound into vibrant sight. Handmade analog art for a digital world.",
      newsletterBody: "Get early access to limited edition drops.",
      marqueeText: "VINTAGE CASSETTES • HANDCRAFTED MOSAICS • CUSTOM WALL ART • LIMITED EDITION •",
      navItems,
      socialLinks,
      seoTitle: "Mixtape Mosaic",
      seoDescription: "Personalized cassette wall art made from real vintage tapes."
    })
  );

  results.push(
    await createIfMissing(
      "page.home",
      pageDocument("home", "Home", [
        {
          _key: "hero",
          _type: "heroSection",
          kicker: "Side A / Track 01",
          title: "Your Mixtape, Reimagined",
          body: "Handcrafted wall art made from real vintage cassette tapes. Customize your own mosaic to tell your unique story.",
          ctaLabel: "Start Customizing",
          ctaHref: "#customizer",
          tone: "yellow"
        },
        {
          _key: "story",
          _type: "copyBandSection",
          kicker: "Analog character",
          title: "Real tapes. Real texture. Your image rebuilt in pieces.",
          bodyMdx:
            "Each Mixtape Mosaic is assembled from vintage cassette tapes, then customized with artwork that respects the holes, edges, labels, shadows, and tiny shifts that make the object feel alive.",
          ctaLabel: "See the Process",
          ctaHref: "/process"
        },
        {
          _key: "wall-presence",
          _type: "wallPresenceSection",
          kicker: "Wall Presence",
          title: "More than a print.",
          body:
            "The image breaks across real cassette shells, label windows, shadows, and uneven vintage details. Up close it reads like an archive. Across the room it lands like a single bold artwork."
        },
        { _key: "customizer", _type: "customizerSection", title: "Build Your Mosaic", subtitle: "Design a one-of-a-kind masterpiece." },
        { _key: "gallery", _type: "galleryPreviewSection", title: "Installed Stories", body: "See how cassette mosaics live in different rooms.", limit: 3 },
        { _key: "journal", _type: "journalPreviewSection", title: "Liner Notes", body: "Studio notes, material stories, and analog obsessions.", limit: 3 },
        { _key: "faq", _type: "faqPreviewSection", title: "Before You Press Play", limit: 6 },
        {
          _key: "cta",
          _type: "ctaSection",
          title: "Ready to build yours?",
          body: "Choose an image, preview the mosaic, and we will turn it into a physical cassette piece.",
          ctaLabel: "Customize Yours",
          ctaHref: "/customize"
        }
      ])
    )
  );

  results.push(
    await createIfMissing(
      "page.process",
      pageDocument("process", "Our Process", [
        {
          _key: "hero",
          _type: "heroSection",
          kicker: "How it works",
          title: "From image to analog object",
          body: "A simple path from selected artwork to a handmade cassette mosaic.",
          ctaLabel: "Start Customizing",
          ctaHref: "/customize",
          tone: "dark"
        },
        {
          _key: "steps",
          _type: "processStepsSection",
          title: "The build",
          steps: [
            { _key: "choose", label: "01", title: "Choose artwork", body: "Start with one of our curated images or upload a high-resolution file you own." },
            { _key: "preview", label: "02", title: "Preview the mosaic", body: "The customizer maps your image across the cassette layout so you can see the direction before ordering." },
            { _key: "make", label: "03", title: "We make the piece", body: "We prepare the artwork, print the cassette overlays, and assemble the finished wall art by hand." }
          ]
        }
      ])
    )
  );

  results.push(
    await createIfMissing(
      "page.customize",
      pageDocument("customize", "Customize", [
        { _key: "customizer", _type: "customizerSection", title: "Build Your Mosaic", subtitle: "Design a one-of-a-kind masterpiece." }
      ])
    )
  );

  results.push(
    await createIfMissing(
      "page.contact",
      pageDocument("contact", "Contact", [
        {
          _key: "hero",
          _type: "heroSection",
          kicker: "Contact",
          title: "Talk to the studio",
          body: "Questions about custom artwork, production timing, or a special commission? Send us a note.",
          ctaLabel: "Start Customizing",
          ctaHref: "/customize",
          tone: "orange"
        }
      ])
    )
  );

  for (const [index, item] of fallbackFaqItems.entries()) {
    results.push(
      await createIfMissing(`faq.${item.id}`, {
        _type: "faqItem",
        question: item.question,
        slug: { _type: "slug", current: item.id },
        answerMdx: item.answer,
        category: "General",
        sortOrder: index,
        active: true
      })
    );
  }

  for (const [index, item] of fallbackGalleryItems.entries()) {
    const id = `gallery.${slugify(item.title)}`;
    const image = (await documentExists(id)) ? undefined : await uploadPublicImage(item.src, item.title);
    results.push(
      await createIfMissing(id, {
        _type: "galleryItem",
        title: item.title,
        projectType: item.size,
        image,
        alt: item.alt,
        caption: item.size,
        sortOrder: index,
        active: true
      })
    );
  }

  for (const [index, post] of fallbackJournalPosts.entries()) {
    const id = `journal.${post.slug}`;
    const image = (await documentExists(id)) ? undefined : await uploadPublicImage(post.src, post.title);
    results.push(
      await createIfMissing(id, {
        _type: "journalPost",
        title: post.title,
        slug: { _type: "slug", current: post.slug },
        volume: post.volume,
        excerpt: post.excerpt,
        author: "Studio Team",
        publishedAt: new Date(Date.UTC(2026, 4, 22 - index, 12)).toISOString(),
        mainImage: image,
        mainImageAlt: post.title,
        bodyMdx: `${post.excerpt}\n\n<Callout title="Studio note">This starter article is ready to replace with the full Mixtape Mosaic story in Sanity Studio.</Callout>\n\n<ProductCTA label="Build your mosaic" href="/customize" />`,
        active: true,
        seoTitle: post.title,
        seoDescription: post.excerpt
      })
    );
  }

  results.push(
    await createIfMissing("product.mixtape-mosaic-custom-cassette-wall-art", {
      _type: "product",
      title: "Mixtape Mosaic Custom Cassette Wall Art",
      slug: { _type: "slug", current: "custom-cassette-wall-art" },
      descriptionMdx:
        "A personalized wall-art object made from real vintage cassette tapes, customized with selected or uploaded artwork.",
      active: true
    })
  );

  for (const [index, variant] of fallbackProductVariantList.entries()) {
    results.push(
      await createIfMissing(`variant.${variant.id}`, {
        _type: "productVariant",
        product: {
          _type: "reference",
          _ref: "product.mixtape-mosaic-custom-cassette-wall-art"
        },
        variantId: variant.id,
        displayName: variant.label,
        dimensions: variant.productType,
        priceCents: variant.priceCents,
        productType: variant.productType,
        productionEstimate: variant.productionEstimate,
        customizerLayoutKey: variant.layout,
        columns: variant.columns,
        rows: variant.rows,
        aspectRatio: variant.aspectRatio,
        sortOrder: index,
        active: true
      })
    );
  }

  return {
    created: results.filter((result) => result.status === "created").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results
  };
}
