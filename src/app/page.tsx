import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { CmsSections, type CmsSection } from "@/components/CmsSections";
import { Customizer } from "@/components/Customizer";
import { GalleryCard, JournalCard, SiteFooter } from "@/components/PublicChrome";
import { getGalleryItems, getJournalPosts, getPageBySlug } from "@/lib/cms";
import { sanityImageUrl } from "@/lib/sanity";

export const revalidate = 86400;

const defaultWallPresenceSection: CmsSection = {
  _key: "wall-presence-default",
  _type: "wallPresenceSection",
  kicker: "Wall Presence",
  title: "More than a print.",
  body:
    "The image breaks across real cassette shells, label windows, shadows, and uneven vintage details. Up close it reads like an archive. Across the room it lands like a single bold artwork."
};

function withDefaultHomeSections(sections: CmsSection[]) {
  if (sections.some((section) => section._type === "wallPresenceSection")) {
    return sections;
  }

  const storyIndex = sections.findIndex((section) => section._type === "copyBandSection");
  const insertAt = storyIndex >= 0 ? storyIndex + 1 : Math.min(2, sections.length);
  return [...sections.slice(0, insertAt), defaultWallPresenceSection, ...sections.slice(insertAt)];
}

function sectionText(section: CmsSection | undefined, field: string, fallback: string) {
  const value = section?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function sectionNumber(section: CmsSection | undefined, field: string, fallback: number) {
  const value = section?.[field];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sectionImage(section: CmsSection | undefined, field: string, fallback: string) {
  return sanityImageUrl(section?.[field], 1400) ?? fallback;
}

function homeSection(sections: CmsSection[], type: string, key?: string) {
  return sections.find((section) => section.enabled !== false && section._type === type && (!key || section._key === key));
}

export default async function HomePage() {
  const [homePage, galleryItems, journalPosts] = await Promise.all([getPageBySlug("home"), getGalleryItems(), getJournalPosts()]);

  if (homePage?.sections?.length) {
    const sections = withDefaultHomeSections(homePage.sections as CmsSection[]);
    const hero = homeSection(sections, "heroSection", "hero") ?? homeSection(sections, "heroSection");
    const story = homeSection(sections, "copyBandSection", "story") ?? homeSection(sections, "copyBandSection");
    const wallPresence = homeSection(sections, "wallPresenceSection");
    const gallery = homeSection(sections, "galleryPreviewSection");
    const journal = homeSection(sections, "journalPreviewSection");
    const customizer = homeSection(sections, "customizerSection");
    const extraHomepageSections = sections.filter(
      (section) =>
        section.enabled !== false &&
        section.showOnHomepage === true &&
        (section._type === "faqPreviewSection" || section._type === "ctaSection")
    );
    const galleryLimit = sectionNumber(gallery, "limit", 3);
    const journalLimit = sectionNumber(journal, "limit", 3);

    return (
      <main>
        {hero ? (
          <section className="bg-primary border-b-4 border-border relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-10 items-center relative z-10">
              <div className="space-y-7 max-w-full min-w-0">
                <div className="inline-block border-2 border-border bg-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest">
                  {sectionText(hero, "kicker", "Side A / Track 01")}
                </div>
                <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl xl:text-[5.35rem] leading-[0.92] uppercase tracking-tighter max-w-full break-words">
                  {sectionText(hero, "title", "Your Mixtape, Reimagined")}
                </h1>
                <p className="text-lg sm:text-xl lg:text-[1.35rem] font-medium max-w-[34rem] border-l-4 border-border pl-4">
                  {sectionText(hero, "body", "Handcrafted wall art made from real vintage cassette tapes. Customize your own mosaic to tell your unique story.")}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={sectionText(hero, "ctaHref", "#customizer")}
                    className="inline-flex items-center justify-center gap-2 bg-foreground text-background border-2 border-border px-6 sm:px-8 py-4 font-heading font-bold text-lg sm:text-xl shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all uppercase tracking-wider"
                  >
                    {sectionText(hero, "ctaLabel", "Start Customizing")}
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>

              <div className="relative w-full max-w-[620px] mx-auto lg:max-w-none">
                <div className="aspect-[4/3] sm:aspect-square bg-accent border-4 border-border shadow-[8px_8px_0_0_#292929] sm:shadow-[12px_12px_0_0_#292929] relative z-10 overflow-hidden group">
                  <img
                    src={sectionImage(hero, "image", "/assets/story/hero-cassette-wall-art.webp")}
                    alt={sectionText(hero, "imageAlt", "Mixtape Mosaic cassette wall art installed above a lounge chair")}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-primary border-2 border-border p-2 shadow-[4px_4px_0_0_#292929]">
                    <Play className="fill-current w-6 h-6" />
                  </div>
                  <div className="absolute bottom-4 right-4 left-4 sm:left-auto bg-background border-2 border-border px-3 sm:px-4 py-2 font-mono font-bold text-xs sm:text-base shadow-[4px_4px_0_0_#292929] uppercase text-center">
                    Handmade in Studio
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {story ? (
          <section className="bg-background border-b-4 border-border py-20 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] overflow-hidden -rotate-2">
                  <img
                    src={sectionImage(story, "image", "/assets/story/cassette-closeup-grid.jpg")}
                    alt={sectionText(story, "imageAlt", "Close-up of vintage cassette tape shells and labels")}
                    className="w-full h-[400px] object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-secondary border-2 border-border px-6 py-4 font-heading font-bold text-2xl text-background shadow-[4px_4px_0_0_#292929] rotate-3 uppercase tracking-wider">
                  Real Materials
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none">
                  {sectionText(story, "title", "Every Tape Has a Story")}
                </h2>
                <div className="w-full h-1 bg-border my-6" />
                <p className="text-lg lg:text-xl font-medium">
                  {sectionText(
                    story,
                    "bodyMdx",
                    "We rescue vintage cassette tapes from attics, thrift stores, and forgotten boxes. Each scratch, label, and spool represents hours of someone's life: mixtapes made for lovers, road trips, and quiet nights."
                  )}
                </p>
                <Link
                  href={sectionText(story, "ctaHref", "/process")}
                  className="inline-flex items-center gap-2 font-heading font-bold text-lg uppercase tracking-wider border-b-4 border-border pb-1 hover:text-secondary hover:border-secondary transition-colors mt-8"
                >
                  {sectionText(story, "ctaLabel", "Read Our Process")} <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {wallPresence ? (
          <CmsSections sections={[wallPresence]} />
        ) : null}

        {customizer ? <Customizer /> : null}

        {gallery ? (
          <section className="bg-muted border-b-4 border-border py-20 lg:py-32">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
                <div>
                  <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">
                    {sectionText(gallery, "title", "Gallery")}
                  </h2>
                  <p className="font-mono font-bold uppercase tracking-widest">
                    {sectionText(gallery, "body", "Recent commissions and limited drops.")}
                  </p>
                </div>
                <Link
                  href="/gallery"
                  className="inline-flex items-center justify-center bg-background text-foreground border-2 border-border px-6 py-3 font-heading font-bold text-lg shadow-[4px_4px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#292929] transition-all uppercase tracking-wider"
                >
                  View all
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {galleryItems.slice(0, galleryLimit).map((item) => (
                  <GalleryCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {journal ? (
          <section className="bg-background border-b-4 border-border py-20 lg:py-32">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
                <div>
                  <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">
                    {sectionText(journal, "title", "Liner Notes")}
                  </h2>
                  <p className="font-mono font-bold uppercase tracking-widest">
                    {sectionText(journal, "body", "Dispatches from the studio.")}
                  </p>
                </div>
                <Link
                  href="/journal"
                  className="inline-flex items-center justify-center bg-card text-foreground border-2 border-border px-6 py-3 font-heading font-bold text-lg shadow-[4px_4px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#292929] transition-all uppercase tracking-wider"
                >
                  View all
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {journalPosts.slice(0, journalLimit).map((post) => (
                  <JournalCard key={post.title} post={post} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {extraHomepageSections.length ? <CmsSections sections={extraHomepageSections} /> : null}
        <SiteFooter />
      </main>
    );
  }

  return (
    <main>
      <section className="bg-primary border-b-4 border-border relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-10 items-center relative z-10">
          <div className="space-y-7 max-w-full min-w-0">
            <div className="inline-block border-2 border-border bg-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest">
              Side A / Track 01
            </div>
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl xl:text-[5.35rem] leading-[0.92] uppercase tracking-tighter max-w-full break-words">
              Your <br />
              Mixtape,
              <br />
              Reimagined.
            </h1>
            <p className="text-lg sm:text-xl lg:text-[1.35rem] font-medium max-w-[34rem] border-l-4 border-border pl-4">
              Handcrafted wall art made from real vintage cassette tapes. Customize your own mosaic to tell your
              unique story.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#customizer"
                className="inline-flex items-center justify-center gap-2 bg-foreground text-background border-2 border-border px-6 sm:px-8 py-4 font-heading font-bold text-lg sm:text-xl shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all uppercase tracking-wider"
              >
                Start Customizing
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-[620px] mx-auto lg:max-w-none">
            <div className="aspect-[4/3] sm:aspect-square bg-accent border-4 border-border shadow-[8px_8px_0_0_#292929] sm:shadow-[12px_12px_0_0_#292929] relative z-10 overflow-hidden group">
              <img
                src="/assets/story/hero-cassette-wall-art.webp"
                alt="Mixtape Mosaic cassette wall art installed above a lounge chair"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-primary border-2 border-border p-2 shadow-[4px_4px_0_0_#292929]">
                <Play className="fill-current w-6 h-6" />
              </div>
              <div className="absolute bottom-4 right-4 left-4 sm:left-auto bg-background border-2 border-border px-3 sm:px-4 py-2 font-mono font-bold text-xs sm:text-base shadow-[4px_4px_0_0_#292929] uppercase text-center">
                Handmade in Studio
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background border-b-4 border-border py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="order-2 md:order-1 relative">
            <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] overflow-hidden -rotate-2">
              <img
                src="/assets/story/cassette-closeup-grid.jpg"
                alt="Close-up of vintage cassette tape shells and labels"
                className="w-full h-[400px] object-cover grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-secondary border-2 border-border px-6 py-4 font-heading font-bold text-2xl text-background shadow-[4px_4px_0_0_#292929] rotate-3 uppercase tracking-wider">
              Real Materials
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none">
              Every Tape <br />
              <span className="text-secondary">Has a Story</span>
            </h2>
            <div className="w-full h-1 bg-border my-6" />
            <p className="text-lg lg:text-xl font-medium">
              We rescue vintage cassette tapes from attics, thrift stores, and forgotten boxes. Each scratch, label,
              and spool represents hours of someone&apos;s life: mixtapes made for lovers, road trips, and quiet nights.
            </p>
            <p className="text-lg lg:text-xl font-medium">
              Our artisans clean, prepare, and arrange these relics into striking neo-brutalist mosaics. It is not just
              decor; it is physical nostalgia, customized to fit your space.
            </p>
            <Link
              href="/process"
              className="inline-flex items-center gap-2 font-heading font-bold text-lg uppercase tracking-wider border-b-4 border-border pb-1 hover:text-secondary hover:border-secondary transition-colors mt-8"
            >
              Read Our Process <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-foreground text-background border-b-4 border-border py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div className="space-y-5">
            <div className="inline-block border-2 border-background bg-secondary text-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#FEB93C] uppercase tracking-widest">
              Wall Presence
            </div>
            <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none">
              More than a print.
            </h2>
            <p className="text-lg lg:text-xl font-medium text-background/80 max-w-xl">
              The image breaks across real cassette shells, label windows, shadows, and uneven vintage details. Up close
              it reads like an archive. Across the room it lands like a single bold artwork.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-4 border-background bg-primary shadow-[8px_8px_0_0_#FEB93C] overflow-hidden -rotate-2">
              <img
                src="/assets/story/arcade-room-cassette-wall.webp"
                alt="Cassette mosaic wall art installed in a retro arcade room"
                className="h-[360px] w-full object-cover"
              />
            </div>
            <div className="space-y-4 pt-8">
              <div className="border-4 border-background bg-card shadow-[8px_8px_0_0_#6B8F8B] overflow-hidden rotate-2">
                <img
                  src="/assets/story/coffee-vinyl-cassette-wall.webp"
                  alt="Cassette wall art installed in a coffee and vinyl shop"
                  className="h-[170px] w-full object-cover"
                />
              </div>
              <div className="border-4 border-background bg-card shadow-[8px_8px_0_0_#F66630] overflow-hidden -rotate-1">
                <img
                  src="/assets/story/brick-room-cassette-wall.webp"
                  alt="Large cassette wall art installed above a brick fireplace"
                  className="h-[170px] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Customizer />

      <section className="bg-muted border-b-4 border-border py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">Gallery</h2>
              <p className="font-mono font-bold uppercase tracking-widest">Recent commissions and limited drops.</p>
            </div>
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center bg-background text-foreground border-2 border-border px-6 py-3 font-heading font-bold text-lg shadow-[4px_4px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#292929] transition-all uppercase tracking-wider"
            >
              View all
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {galleryItems.slice(0, 3).map((item) => (
              <GalleryCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background border-b-4 border-border py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <h2 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">Liner Notes</h2>
              <p className="font-mono font-bold uppercase tracking-widest">Dispatches from the studio.</p>
            </div>
            <Link
              href="/journal"
              className="inline-flex items-center justify-center bg-card text-foreground border-2 border-border px-6 py-3 font-heading font-bold text-lg shadow-[4px_4px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#292929] transition-all uppercase tracking-wider"
            >
              View all
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {journalPosts.slice(0, 3).map((post) => (
              <JournalCard key={post.title} post={post} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
