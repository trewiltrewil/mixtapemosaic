import { JournalCard, SiteFooter } from "@/components/PublicChrome";
import { getJournalPosts } from "@/lib/cms";

export const revalidate = 86400;

export default async function JournalPage() {
  const journalPosts = await getJournalPosts();

  return (
    <main>
      <section className="min-h-screen bg-muted pb-32">
        <header className="bg-foreground text-background border-b-4 border-border min-h-[316px] flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-[-0.05em] mb-6 leading-none">
            Liner Notes
          </h1>
          <p className="font-mono text-xl uppercase tracking-[0.16em] max-w-[560px] mx-auto text-secondary leading-snug">
            Dispatches, thoughts, and noise from the studio.
          </p>
        </header>

        <div className="max-w-[1040px] mx-auto px-6 py-16 lg:py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {journalPosts.map((post) => (
              <JournalCard key={post.title} post={post} />
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
