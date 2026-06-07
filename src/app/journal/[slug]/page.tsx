import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MdxContent } from "@/components/MdxContent";
import { JournalCard, SiteFooter } from "@/components/PublicChrome";
import { getJournalPostBySlug, getJournalPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getJournalPostBySlug(slug), getJournalPosts()]);

  if (!post) {
    notFound();
  }

  const related = posts.filter((item) => item.slug !== post.slug).slice(0, 2);

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
              {post.volume}
            </div>
            <h1 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter leading-none mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 font-mono text-sm font-bold uppercase text-muted-foreground border-t-2 border-b-2 border-border py-4">
              <span>By {post.author || "Studio Team"}</span>
              <span>*</span>
              <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US") : "Studio notes"}</span>
            </div>
          </div>

          <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] p-2 mb-12">
            <img
              src={post.src}
              alt={post.mainImageAlt || post.title}
              className="w-full h-[500px] object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>

          <div className="max-w-none space-y-7">
            <MdxContent source={post.bodyMdx || post.excerpt || ""} />
          </div>

          {related.length ? (
            <div className="mt-20 pt-12 border-t-8 border-border">
              <h3 className="font-heading font-black text-3xl uppercase tracking-tighter mb-8">Keep Reading</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {related.map((item) => (
                  <JournalCard key={item.title} post={item} />
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
