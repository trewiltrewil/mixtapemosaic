import { FaqAccordion, type FaqItem } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/PublicChrome";
import { getFaqItems } from "@/lib/cms";

export const revalidate = 86400;

export const metadata = {
  title: "FAQ | Mixtape Mosaic",
  description: "Answers about custom cassette wall art, vintage tape variation, proofs, production timing, and shipping."
};

function faqSchemaText(value: string) {
  return value
    .replace(/[`*_>#-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function FaqPage() {
  const faqItems: FaqItem[] = await getFaqItems();
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqSchemaText(item.answer)
      }
    }))
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
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
