import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Customizer } from "@/components/Customizer";
import { FaqAccordion } from "@/components/FaqAccordion";
import { GalleryCard, JournalCard } from "@/components/PublicChrome";
import { getFaqItems, getGalleryItems, getJournalPosts } from "@/lib/cms";
import { sanityImageUrl } from "@/lib/sanity";
import { MdxContent } from "./MdxContent";

type CmsSection = Record<string, unknown> & { _type: string };

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function CmsSections({ sections }: { sections?: CmsSection[] | null }) {
  if (!sections?.length) {
    return null;
  }

  return (
    <>
      {await Promise.all(
        sections.map(async (section, index) => {
          if (section._type === "heroSection") {
            const image = sanityImageUrl(section.image, 1400);
            return (
              <section key={index} className="bg-primary border-b-4 border-border py-20 lg:py-32">
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-7">
                    {section.kicker ? (
                      <div className="inline-block border-2 border-border bg-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest">
                        {text(section.kicker)}
                      </div>
                    ) : null}
                    <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9]">
                      {text(section.title)}
                    </h1>
                    {section.body ? <p className="text-xl font-medium border-l-4 border-border pl-6">{text(section.body)}</p> : null}
                    {section.ctaHref && section.ctaLabel ? (
                      <Link href={text(section.ctaHref)} className="inline-flex items-center gap-2 bg-foreground text-background border-2 border-border px-6 py-4 font-heading font-black uppercase shadow-[5px_5px_0_0_#6B8F8B]">
                        {text(section.ctaLabel)} <ArrowRight className="w-5 h-5" />
                      </Link>
                    ) : null}
                  </div>
                  {image ? (
                    <div className="bg-accent border-4 border-border shadow-[10px_10px_0_0_#292929] p-2">
                      <img src={image} alt={text(section.imageAlt, text(section.title))} className="w-full h-[520px] object-cover border-2 border-border" />
                    </div>
                  ) : null}
                </div>
              </section>
            );
          }

          if (section._type === "copyBandSection") {
            const image = sanityImageUrl(section.image, 1200);
            return (
              <section key={index} className="bg-background border-b-4 border-border py-20 lg:py-32">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
                  {image ? (
                    <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] overflow-hidden -rotate-2">
                      <img src={image} alt={text(section.imageAlt, text(section.title))} className="w-full h-[400px] object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </div>
                  ) : null}
                  <div className="space-y-6">
                    {section.kicker ? <p className="font-mono font-bold uppercase tracking-widest text-secondary">{text(section.kicker)}</p> : null}
                    <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none">{text(section.title)}</h2>
                    <MdxContent source={text(section.bodyMdx)} />
                    {section.ctaHref && section.ctaLabel ? <Link href={text(section.ctaHref)} className="inline-flex items-center gap-2 font-heading font-bold text-lg uppercase tracking-wider border-b-4 border-border pb-1">{text(section.ctaLabel)} <ArrowRight className="w-5 h-5" /></Link> : null}
                  </div>
                </div>
              </section>
            );
          }

          if (section._type === "processStepsSection") {
            const steps = Array.isArray(section.steps) ? section.steps : [];
            return (
              <section key={index} className="bg-background py-20 lg:py-32">
                <div className="max-w-5xl mx-auto px-6 space-y-24">
                  {section.title ? <h2 className="font-heading font-black text-5xl uppercase tracking-tighter">{text(section.title)}</h2> : null}
                  {steps.map((rawStep, stepIndex) => {
                    const step = rawStep as Record<string, unknown>;
                    const image = sanityImageUrl(step.image, 1000);
                    return (
                      <article key={stepIndex} className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                          <div className="inline-block border-2 border-border px-4 py-1 font-heading font-black text-2xl shadow-[4px_4px_0_0_#292929] bg-primary">{text(step.label, `Step ${String(stepIndex + 1).padStart(2, "0")}`)}</div>
                          <h3 className="font-heading font-black text-4xl uppercase tracking-tighter">{text(step.title)}</h3>
                          <p className="text-lg font-medium">{text(step.body)}</p>
                        </div>
                        {image ? (
                          <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] p-2">
                            <img src={image} alt={text(step.imageAlt, text(step.title))} className="w-full h-80 object-cover border-2 border-border grayscale hover:grayscale-0 transition-all duration-500" />
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (section._type === "galleryPreviewSection") {
            const items = (await getGalleryItems()).slice(0, number(section.limit, 3));
            return (
              <section key={index} className="bg-muted border-b-4 border-border py-20 lg:py-32">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                  {items.map((item) => <GalleryCard key={item.title} item={item} />)}
                </div>
              </section>
            );
          }

          if (section._type === "journalPreviewSection") {
            const posts = (await getJournalPosts()).slice(0, number(section.limit, 3));
            return (
              <section key={index} className="bg-background border-b-4 border-border py-20 lg:py-32">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                  {posts.map((post) => <JournalCard key={post.title} post={post} />)}
                </div>
              </section>
            );
          }

          if (section._type === "faqPreviewSection") {
            const items = (await getFaqItems()).slice(0, number(section.limit, 6));
            return (
              <section key={index} className="bg-muted border-b-4 border-border py-20 lg:py-32">
                <div className="max-w-4xl mx-auto px-6">
                  <FaqAccordion items={items} />
                </div>
              </section>
            );
          }

          if (section._type === "customizerSection") {
            return <Customizer key={index} />;
          }

          if (section._type === "ctaSection") {
            return (
              <section key={index} className="bg-primary border-b-4 border-border py-20 lg:py-28 text-center">
                <div className="max-w-4xl mx-auto px-6 space-y-6">
                  <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">{text(section.title)}</h2>
                  {section.body ? <p className="text-xl font-medium">{text(section.body)}</p> : null}
                  {section.ctaHref && section.ctaLabel ? <Link href={text(section.ctaHref)} className="inline-flex bg-foreground text-background border-2 border-border px-8 py-4 font-heading font-black uppercase shadow-[6px_6px_0_0_#6B8F8B]">{text(section.ctaLabel)}</Link> : null}
                </div>
              </section>
            );
          }

          return null;
        })
      )}
    </>
  );
}
