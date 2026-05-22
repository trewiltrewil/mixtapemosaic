import { FaqAccordion, type FaqItem } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/PublicChrome";

const faqItems: FaqItem[] = [
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
      "Pieces are packed as finished wall art and shipped with protective packaging. The checkout experience currently uses a placeholder flow while the Shopify integration is prepared."
  },
  {
    id: "returns",
    question: "Can custom pieces be returned?",
    answer:
      "Because each mosaic is made to order from selected artwork and vintage materials, custom returns are limited. If something arrives damaged or materially different from the approved direction, we will make it right."
  }
];

export default function FaqPage() {
  return (
    <main>
      <section className="min-h-screen bg-muted pb-32">
        <header className="bg-foreground text-background border-b-4 border-border min-h-[316px] flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-[-0.05em] mb-6 leading-none">
            FAQ
          </h1>
          <p className="font-mono text-xl uppercase tracking-[0.16em] max-w-[620px] mx-auto text-secondary leading-snug">
            Answers for custom art, vintage variation, proofs, and production.
          </p>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <FaqAccordion items={faqItems} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
