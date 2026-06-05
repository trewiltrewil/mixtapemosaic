import Link from "next/link";
import type { ReactNode } from "react";

export const galleryItems = [
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

export const journalPosts = [
  {
    volume: "Vol. 06",
    title: "The Anatomy of a Maxell UR90",
    src: "/assets/story/cassette-six-pack.jpg",
    color: "bg-primary",
    href: "/journal/maxell-ur90"
  },
  {
    volume: "Vol. 05",
    title: "Why We Don't Use Blanks",
    src: "/assets/story/arcade-room-cassette-wall.webp",
    color: "bg-secondary",
    href: "/journal/maxell-ur90"
  },
  {
    volume: "Vol. 04",
    title: "Restoring the Boombox Aesthetic",
    src: "/assets/story/coffee-vinyl-cassette-wall.webp",
    color: "bg-accent",
    href: "/journal/maxell-ur90"
  },
  {
    volume: "Vol. 03",
    title: "When the Grid Becomes a Picture",
    src: "/assets/story/brick-room-cassette-wall.webp",
    color: "bg-primary",
    href: "/journal/maxell-ur90"
  },
  {
    volume: "Vol. 02",
    title: "The Perfect Imperfection",
    src: "/assets/story/zebra-tape-wall.jpg",
    color: "bg-accent",
    href: "/journal/maxell-ur90"
  },
  {
    volume: "Vol. 01",
    title: "Neon Colors and Hard Edges",
    src: "/figma/blog-neon-hard-edges.png",
    color: "bg-secondary",
    href: "/journal/maxell-ur90"
  }
];

export function Marquee() {
  const text = "VINTAGE CASSETTES • HANDCRAFTED MOSAICS • CUSTOM WALL ART • LIMITED EDITION • ";

  return (
    <div className="w-full bg-foreground text-background border-y-4 border-border overflow-hidden h-20 relative flex items-center" aria-hidden="true">
      <div className="animate-marquee whitespace-nowrap flex font-heading font-black text-2xl lg:text-4xl uppercase tracking-[0.1em] min-w-max">
        <span className="px-4">{text}</span>
        <span className="px-4">{text}</span>
        <span className="px-4">{text}</span>
        <span className="px-4">{text}</span>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <>
      <Marquee />
      <footer className="bg-primary text-foreground py-20 lg:py-24 border-t-8 border-border relative z-10">
        <div className="max-w-[1080px] mx-auto px-6 grid md:grid-cols-[1.4fr_0.7fr_0.9fr] gap-14 lg:gap-20 text-center md:text-left">
          <div className="space-y-6 flex flex-col items-center md:items-start">
            <div className="flex flex-col items-center md:items-start gap-4">
              <img src="/assets/mixtape-mosaic-logo-compact.svg" alt="Mixtape Mosaic" className="w-[280px] sm:w-[366px] h-auto" />
            </div>
            <p className="font-medium text-lg max-w-md text-foreground/80 font-mono mx-auto md:mx-0">
              Turning vintage sound into vibrant sight. Handmade analog art for a digital world.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-col items-center md:items-start">
            <h4 className="font-heading font-black text-2xl uppercase tracking-wider mb-6 text-foreground">Navigate</h4>
            <ul className="space-y-4 font-bold uppercase tracking-wider">
              <li><Link href="/customize" className="hover:text-background transition-colors">Shop</Link></li>
              <li><Link href="/process" className="hover:text-background transition-colors">Our Process</Link></li>
              <li><Link href="/gallery" className="hover:text-background transition-colors">Gallery</Link></li>
              <li><Link href="/journal" className="hover:text-background transition-colors">Journal</Link></li>
              <li><Link href="/faq" className="hover:text-background transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-background transition-colors">Contact</Link></li>
            </ul>
          </nav>
          <form className="flex flex-col items-center md:items-start">
            <h4 className="font-heading font-black text-2xl uppercase tracking-wider mb-6 text-foreground">Newsletter</h4>
            <p className="font-medium mb-4 text-foreground/80 font-mono">Get early access to limited edition drops.</p>
            <div className="flex border-2 border-border shadow-[4px_4px_0_0_#292929]">
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                aria-label="Email address"
                className="w-full bg-input-background text-foreground px-4 py-2 font-mono font-bold focus:outline-none placeholder:text-muted-foreground"
              />
              <button type="button" className="bg-secondary text-background border-l-2 border-border px-4 py-2 font-bold uppercase hover:bg-foreground transition-colors">
                Join
              </button>
            </div>
          </form>
        </div>
        <div className="max-w-[1080px] mx-auto px-6 mt-20 pt-8 border-t-4 border-border flex flex-col md:flex-row justify-between items-center gap-4 font-mono font-bold text-sm uppercase text-foreground">
          <p>© 2026 Mixtape Mosaic. All Rights Reserved.</p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/" rel="noreferrer" target="_blank" className="hover:text-background transition-colors">Instagram</a>
            <a href="https://twitter.com/" rel="noreferrer" target="_blank" className="hover:text-background transition-colors">Twitter</a>
            <a href="https://www.pinterest.com/" rel="noreferrer" target="_blank" className="hover:text-background transition-colors">Pinterest</a>
          </div>
        </div>
      </footer>
    </>
  );
}

export function PageHero({ title, kicker, tone = "dark" }: { title: string; kicker: string; tone?: "dark" | "orange" }) {
  return (
    <section className={`page-hero ${tone === "orange" ? "page-hero-orange" : ""}`}>
      <h1>{title}</h1>
      <p>{kicker}</p>
    </section>
  );
}

export function PhotoFrame({
  src,
  alt,
  label,
  tilt = "left"
}: {
  src: string;
  alt: string;
  label?: string;
  tilt?: "left" | "right" | "none";
}) {
  return (
    <figure className={`photo-frame tilt-${tilt}`}>
      <img src={src} alt={alt} />
      {label ? <figcaption>{label}</figcaption> : null}
    </figure>
  );
}

export function GalleryCard({ item }: { item: (typeof galleryItems)[number] }) {
  return (
    <article className="group cursor-pointer">
      <div className="aspect-square border-4 border-border bg-muted overflow-hidden shadow-[8px_8px_0_0_#292929] mb-4 group-hover:shadow-[12px_12px_0_0_#F66630] transition-all">
        <img src={item.src} alt={item.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="flex justify-between items-end border-b-2 border-border pb-2">
        <h3 className="font-heading font-black text-2xl uppercase tracking-tighter">{item.title}</h3>
        <span className="font-mono font-bold text-sm text-secondary">{item.size}</span>
      </div>
    </article>
  );
}

export function JournalCard({ post }: { post: (typeof journalPosts)[number] }) {
  return (
    <article>
      <Link
        href={post.href}
        aria-label={`Read ${post.title}`}
        className="group bg-background border-[3px] border-border shadow-[8px_8px_0_0_#292929] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#292929] transition-all flex flex-col h-full"
      >
        <div className="relative border-b-[3px] border-border aspect-[1.34] overflow-hidden bg-card">
          <img
            src={post.src}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
          />
          <span className={`absolute top-4 left-4 z-10 ${post.color} border-2 border-border px-3 py-1 font-mono font-bold text-sm shadow-[2px_2px_0_0_#292929]`}>
            {post.volume}
          </span>
        </div>
        <div className="bg-background p-6 flex flex-col justify-between gap-8 min-h-[126px] grow">
          <h3 className="font-heading font-black text-[22px] uppercase tracking-tighter leading-[1.08] group-hover:text-secondary transition-colors">
            {post.title}
          </h3>
          <p className="font-mono font-bold uppercase text-sm tracking-wider">Read Article →</p>
        </div>
      </Link>
    </article>
  );
}

export function TapeGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "tape-grid tape-grid-compact" : "tape-grid"} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={`tape-icon tape-color-${(index % 4) + 1}`} />
      ))}
    </div>
  );
}

export function SectionShell({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`section-shell ${className}`}>{children}</section>;
}
