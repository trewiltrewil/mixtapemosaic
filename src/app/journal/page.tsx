import { JournalCard, PageHero, SiteFooter } from "@/components/PublicChrome";
import { getJournalPosts } from "@/lib/cms";

export const revalidate = 86400;

export default async function JournalPage() {
  const journalPosts = await getJournalPosts();

  return (
    <main>
      <section className="min-h-screen bg-muted pb-32">
        <PageHero title="Liner Notes" kicker="Dispatches, thoughts, and noise from the studio." />

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
