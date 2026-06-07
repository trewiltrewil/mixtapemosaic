import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Customizer } from "@/components/Customizer";
import { FaqAccordion } from "@/components/FaqAccordion";
import { GalleryCard, JournalCard } from "@/components/PublicChrome";
import { getFaqItems, getGalleryItems, getJournalPosts } from "@/lib/cms";
import { sanityImageUrl } from "@/lib/sanity";
import { MdxContent } from "./MdxContent";

export type CmsSection = Record<string, unknown> & { _type: string };

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function localImageForSection(section: CmsSection) {
  const key = text(section._key);
  if (section._type === "heroSection") {
    if (key === "hero" || text(section.title).toLowerCase().includes("mixtape")) {
      return "/assets/story/hero-cassette-wall-art.webp";
    }
    return "/assets/story/brick-room-cassette-wall.webp";
  }

  if (section._type === "copyBandSection") {
    return "/assets/story/cassette-closeup-grid.jpg";
  }

  return null;
}

function imageForSection(section: CmsSection, width: number) {
  return sanityImageUrl(section.image, width) ?? localImageForSection(section);
}

export async function CmsSections({ sections }: { sections?: CmsSection[] | null }) {
  const visibleSections = sections?.filter((section) => section.enabled !== false);

  if (!visibleSections?.length) {
    return null;
  }

  return (
    <>
      {await Promise.all(
        visibleSections.map(async (section, index) => {
          if (section._type === "heroSection") {
            const image = imageForSection(section, 1400);
            return (
              <section key={index} className="bg-primary border-b-4 border-border relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-10 items-center relative z-10">
                  <div className="space-y-7 max-w-full min-w-0">
                    {section.kicker ? (
                      <div className="inline-block border-2 border-border bg-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest">
                        {text(section.kicker)}
                      </div>
                    ) : null}
                    <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl xl:text-[5.35rem] uppercase tracking-tighter leading-[0.92] max-w-full break-words">
                      {text(section.title)}
                    </h1>
                    {section.body ? <p className="text-lg sm:text-xl lg:text-[1.35rem] font-medium max-w-[34rem] border-l-4 border-border pl-4">{text(section.body)}</p> : null}
                    {section.ctaHref && section.ctaLabel ? (
                      <Link href={text(section.ctaHref)} className="inline-flex items-center justify-center gap-2 bg-foreground text-background border-2 border-border px-6 sm:px-8 py-4 font-heading font-bold text-lg sm:text-xl shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all uppercase tracking-wider">
                        {text(section.ctaLabel)} <ArrowRight className="w-5 h-5" />
                      </Link>
                    ) : null}
                  </div>
                  {image ? (
                    <div className="relative w-full max-w-[620px] mx-auto lg:max-w-none">
                      <div className="aspect-[4/3] sm:aspect-square bg-accent border-4 border-border shadow-[8px_8px_0_0_#292929] sm:shadow-[12px_12px_0_0_#292929] relative z-10 overflow-hidden group">
                        <img src={image} alt={text(section.imageAlt, text(section.title))} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-4 left-4 bg-primary border-2 border-border p-2 shadow-[4px_4px_0_0_#292929]">
                          <Play className="fill-current w-6 h-6" />
                        </div>
                        <div className="absolute bottom-4 right-4 left-4 sm:left-auto bg-background border-2 border-border px-3 sm:px-4 py-2 font-mono font-bold text-xs sm:text-base shadow-[4px_4px_0_0_#292929] uppercase text-center">
                          Handmade in Studio
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          }

          if (section._type === "copyBandSection") {
            const image = imageForSection(section, 1200);
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

          if (section._type === "wallPresenceSection") {
            const tallImage = sanityImageUrl(section.tallImage, 1200) ?? "/assets/story/arcade-room-cassette-wall.webp";
            const topImage = sanityImageUrl(section.topImage, 900) ?? "/assets/story/coffee-vinyl-cassette-wall.webp";
            const bottomImage = sanityImageUrl(section.bottomImage, 900) ?? "/assets/story/brick-room-cassette-wall.webp";
            return (
              <section key={index} className="bg-foreground text-background border-b-4 border-border py-16 lg:py-24">
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
                  <div className="space-y-5">
                    {section.kicker ? (
                      <div className="inline-block border-2 border-background bg-secondary text-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#FEB93C] uppercase tracking-widest">
                        {text(section.kicker)}
                      </div>
                    ) : null}
                    <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none">
                      {text(section.title, "More than a print.")}
                    </h2>
                    {section.body ? (
                      <p className="text-lg lg:text-xl font-medium text-background/80 max-w-xl">
                        {text(section.body)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-4 border-background bg-primary shadow-[8px_8px_0_0_#FEB93C] overflow-hidden -rotate-2">
                      <img src={tallImage} alt={text(section.tallImageAlt, "Cassette mosaic wall art installed in a retro arcade room")} className="h-[360px] w-full object-cover" />
                    </div>
                    <div className="space-y-4 pt-8">
                      <div className="border-4 border-background bg-card shadow-[8px_8px_0_0_#6B8F8B] overflow-hidden rotate-2">
                        <img src={topImage} alt={text(section.topImageAlt, "Cassette wall art installed in a coffee and vinyl shop")} className="h-[170px] w-full object-cover" />
                      </div>
                      <div className="border-4 border-background bg-card shadow-[8px_8px_0_0_#F66630] overflow-hidden -rotate-1">
                        <img src={bottomImage} alt={text(section.bottomImageAlt, "Large cassette wall art installed above a brick fireplace")} className="h-[170px] w-full object-cover" />
                      </div>
                    </div>
                  </div>
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
