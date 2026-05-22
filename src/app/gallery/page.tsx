import { GalleryCard, SiteFooter, galleryItems } from "@/components/PublicChrome";

export default function GalleryPage() {
  return (
    <main>
      <section className="bg-accent text-foreground border-b-4 border-border py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="inline-block border-2 border-border bg-background px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest mb-8">
            Gallery
          </div>
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9] max-w-4xl">
            Recent commissions & studio proofs.
          </h1>
        </div>
      </section>
      <section className="bg-background py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryItems.map((item) => (
            <GalleryCard key={item.title} item={item} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
