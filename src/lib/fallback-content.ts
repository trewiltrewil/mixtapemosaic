import { productVariants } from "./commerce";

export const fallbackGalleryItems = [
  {
    title: "Arcade Afterglow",
    size: "Installed piece",
    src: "/assets/story/arcade-room-cassette-wall.webp",
    alt: "Cassette mosaic wall art installed in a retro arcade room"
  },
  {
    title: "Brick Room Statement",
    size: "Home install",
    src: "/assets/story/brick-room-cassette-wall.webp",
    alt: "Large cassette mosaic wall art installed above a brick fireplace"
  },
  {
    title: "Coffee & Vinyl",
    size: "Retail install",
    src: "/assets/story/coffee-vinyl-cassette-wall.webp",
    alt: "Cassette wall art installed in a coffee and vinyl shop"
  },
  {
    title: "Wedding Memory",
    size: "Photo mosaic",
    src: "/assets/story/wedding-memory-cassette-wall.webp",
    alt: "Wedding photo cassette mosaic displayed in a dining room"
  },
  {
    title: "Blue Food Truck",
    size: "Artwork test",
    src: "/assets/ryan-waring-geeZzrAXyMQ-unsplash.jpg",
    alt: "Blue food truck artwork sample"
  },
  {
    title: "Sunset Palms",
    size: "Artwork test",
    src: "/assets/aishwarya-mv-3i-TsBuiTPk-unsplash.jpg",
    alt: "Sunset palm artwork sample"
  },
  {
    title: "Warm Tape Pile",
    size: "Texture study",
    src: "/assets/story/cassette-pile-warm.jpg",
    alt: "Close-up pile of vintage cassette tapes"
  },
  {
    title: "Studio Closeup",
    size: "Material study",
    src: "/assets/story/cassette-closeup-grid.jpg",
    alt: "Close-up grid of stacked cassette tapes"
  },
  {
    title: "Green Label Set",
    size: "Color study",
    src: "/assets/story/cassette-green-labels.jpg",
    alt: "Green tinted cassette tape close-up grid"
  }
];

export const fallbackJournalPosts = [
  {
    volume: "Vol. 06",
    title: "The Anatomy of a Maxell UR90",
    slug: "maxell-ur90",
    src: "/assets/story/cassette-six-pack.jpg",
    color: "bg-primary",
    href: "/journal/maxell-ur90",
    excerpt: "A studio note on cassette materials, texture, and why some shells just feel right."
  },
  {
    volume: "Vol. 05",
    title: "Why We Don't Use Blanks",
    slug: "why-we-dont-use-blanks",
    src: "/assets/story/arcade-room-cassette-wall.webp",
    color: "bg-secondary",
    href: "/journal/maxell-ur90",
    excerpt: "Vintage variation is the whole point."
  },
  {
    volume: "Vol. 04",
    title: "Restoring the Boombox Aesthetic",
    slug: "restoring-the-boombox-aesthetic",
    src: "/assets/story/coffee-vinyl-cassette-wall.webp",
    color: "bg-accent",
    href: "/journal/maxell-ur90",
    excerpt: "Why analog objects still carry room presence."
  },
  {
    volume: "Vol. 03",
    title: "When the Grid Becomes a Picture",
    slug: "when-the-grid-becomes-a-picture",
    src: "/assets/story/brick-room-cassette-wall.webp",
    color: "bg-primary",
    href: "/journal/maxell-ur90",
    excerpt: "Custom artwork, broken into a physical rhythm."
  },
  {
    volume: "Vol. 02",
    title: "The Perfect Imperfection",
    slug: "the-perfect-imperfection",
    src: "/assets/story/zebra-tape-wall.jpg",
    color: "bg-accent",
    href: "/journal/maxell-ur90",
    excerpt: "The little shifts that make each piece honest."
  },
  {
    volume: "Vol. 01",
    title: "Neon Colors and Hard Edges",
    slug: "neon-colors-and-hard-edges",
    src: "/figma/blog-neon-hard-edges.png",
    color: "bg-secondary",
    href: "/journal/maxell-ur90",
    excerpt: "A loud little note on visual language."
  }
];

export const fallbackFaqItems = [
  {
    id: "preview-accuracy",
    question: "How accurate is the preview?",
    answer:
      "The preview is meant to be a realistic proof of the final direction, not a pixel-perfect guarantee. Every piece uses real vintage cassette tapes, so tape color, labels, tiny rotations, visible edges, and natural spacing can vary."
  },
  {
    id: "image-quality",
    question: "What kind of image works best?",
    answer:
      "High-resolution images work best, especially wide or landscape artwork with strong color and clear contrast. Very small files, screenshots, or heavily compressed images may look soft once they are spread across the full cassette mosaic."
  },
  {
    id: "vintage-variation",
    question: "Will my tapes look exactly like the preview?",
    answer:
      "No two builds are exactly alike. We use real vintage cassettes, so the shells, screw holes, labels, scuffs, color shifts, and small alignment differences are part of the finished object rather than defects."
  },
  {
    id: "custom-artwork",
    question: "Can I upload my own artwork?",
    answer:
      "Yes. You can upload your own image in the customizer. We recommend using artwork you own or have permission to use, and we may contact you if the file quality or content needs review before production."
  },
  {
    id: "proofing",
    question: "Do I get a proof before production?",
    answer:
      "The customizer gives you an instant preview, and the order flow is structured for a proofing step. For custom work, we can review the artwork before making the physical piece so there are no surprises."
  },
  {
    id: "timeline",
    question: "How long does production take?",
    answer:
      "Current production estimates are typically two to three weeks before shipping. Timing can change based on order volume, artwork review, and sourcing the right mix of vintage tapes."
  },
  {
    id: "shipping",
    question: "How does shipping work?",
    answer:
      "Pieces are packed as finished wall art and shipped with protective packaging. Checkout currently supports free US shipping."
  },
  {
    id: "returns",
    question: "Can custom pieces be returned?",
    answer:
      "Because each mosaic is made to order from selected artwork and vintage materials, custom returns are limited. If something arrives damaged or materially different from the approved direction, we will make it right."
  }
];

export const fallbackProductVariantList = Object.values(productVariants).map((variant, index) => ({
  id: variant.id,
  label: variant.label,
  productType: variant.productType,
  priceCents: variant.priceCents,
  productionEstimate: "Ships in 2-3 weeks",
  layout: variant.id === "landscape" ? "landscape" : "square",
  columns: variant.id === "landscape" ? 8 : 6,
  rows: 9,
  panelColumns: variant.id === "landscape" ? 4 : 3,
  panelRows: variant.id === "portrait" ? 4 : 3,
  panelCount: variant.id === "square" ? 9 : 12,
  tapeCountLabel: `${(variant.id === "landscape" ? 8 : 6) * 9} tapes`,
  aspectRatio: variant.id === "landscape" ? "1630 / 1254" : "1 / 1",
  sortOrder: index
}));
