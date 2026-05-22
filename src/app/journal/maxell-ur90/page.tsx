import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JournalCard, SiteFooter, journalPosts } from "@/components/PublicChrome";

export default function MaxellUr90Page() {
  return (
    <main>
      <section className="min-h-screen bg-background pb-32">
        <article className="max-w-4xl mx-auto px-6 py-20">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 font-mono font-bold uppercase tracking-wider mb-12 hover:text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </Link>

          <div className="mb-8">
            <div className="inline-block bg-primary border-2 border-border px-3 py-1 font-mono font-bold text-sm shadow-[2px_2px_0_0_#292929] mb-6">
              Vol. 12
            </div>
            <h1 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none mb-6">
              The Anatomy of a Maxell UR90
            </h1>
            <div className="flex items-center gap-4 font-mono text-sm font-bold uppercase text-muted-foreground border-t-2 border-b-2 border-border py-4">
              <span>By Studio Team</span>
              <span>*</span>
              <span>October 24, 1994</span>
            </div>
          </div>

          <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] p-2 mb-12">
            <img
              src="/figma/blog-maxell-ur90.png"
              alt="Maxell UR90 cassette"
              className="w-full h-[500px] object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>

          <div className="font-medium text-lg lg:text-xl leading-relaxed max-w-none space-y-7">
            <p className="text-2xl leading-normal border-l-4 border-primary pl-6 ml-0 lg:-ml-7 mb-8 font-bold">
              If you grew up in the late 80s or early 90s, the Maxell UR90 wasn&apos;t just a cassette tape - it was a
              canvas. It was 90 minutes of pure potential.
            </p>

            <p>
              When we source materials for our mosaics, we come across hundreds of different tape brands. TDKs, Sonys,
              Memorex. But there&apos;s something mathematically perfect about the Maxell UR90. The clear plastic shell,
              the textured grip on the bottom edge, and that iconic red and gold J-card insert.
            </p>

            <h2 className="font-heading font-black text-4xl mt-12 mb-6 uppercase tracking-tighter">Built Like a Tank</h2>

            <p>
              The structural integrity of the UR90 is exactly why we love using it in our neo-brutalist pieces. Unlike
              cheaper tapes that glued their shells together, Maxell used five metal screws to hold the two halves in
              place. This meant you could actually take them apart, splice the tape, and put them back together.
            </p>

            <div className="grid md:grid-cols-2 gap-8 my-12">
              <div className="bg-accent border-4 border-border p-2 shadow-[8px_8px_0_0_#292929] rotate-2">
                <img
                  src="/product/prototype-wall-unit.jpg"
                  alt="Cassette wall unit detail"
                  className="w-full h-64 object-cover border-2 border-border grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="bg-secondary border-4 border-border p-2 shadow-[8px_8px_0_0_#292929] -rotate-2">
                <img
                  src="/figma/process-art-studio.png"
                  alt="Studio material detail"
                  className="w-full h-64 object-cover border-2 border-border grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>

            <p>
              When we prep these tapes for our mosaics, we strip out the magnetic ribbon (which we recycle locally) and
              focus entirely on that architectural plastic shell. When painted with heavy acrylics - like our signature
              Bright Yellow or Electric Orange - the tape ceases to be a recording medium and becomes a literal building
              block.
            </p>

            <h2 className="font-heading font-black text-4xl mt-12 mb-6 uppercase tracking-tighter">The Grid System</h2>

            <p>
              A standard cassette measures exactly 4 x 2.5 inches. It&apos;s a perfect golden ratio for grid assembly.
              When we stack 36 of them together for our Large format pieces, the visible spools and texture ridges create
              a mesmerizing geometric pattern that changes as you walk past it.
            </p>

            <p>
              It&apos;s taking a piece of analog history and turning it into permanent, structural art. The Maxell UR90
              isn&apos;t recording music anymore, but it&apos;s still making a lot of noise.
            </p>
          </div>

          <div className="mt-20 pt-12 border-t-8 border-border">
            <h3 className="font-heading font-black text-3xl uppercase tracking-tighter mb-8">Keep Reading</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {journalPosts.slice(1, 3).map((post) => (
                <JournalCard key={post.title} post={post} />
              ))}
            </div>
          </div>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
