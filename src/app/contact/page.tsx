import { CmsSections } from "@/components/CmsSections";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function ContactPage() {
  const page = await getPageBySlug("contact");
  if (page?.sections?.length) {
    return (
      <main>
        <CmsSections sections={page.sections} />
        <SiteFooter />
      </main>
    );
  }

  return (
    <main>
      <section className="bg-background py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="inline-block border-2 border-border bg-primary px-4 py-1 font-mono font-bold text-sm shadow-[4px_4px_0_0_#292929] uppercase tracking-widest">
              Contact
            </div>
            <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9]">
              Hit us <span className="text-secondary">up.</span>
            </h1>
            <p className="text-xl font-medium leading-relaxed border-l-4 border-border pl-6">
              Got a custom request, a crate of tapes, or a question before you build your piece? Drop a line.
            </p>
          </div>
          <form className="bg-card border-4 border-border p-6 lg:p-8 shadow-[10px_10px_0_0_#292929] space-y-5">
            <label className="block font-mono font-bold uppercase text-sm space-y-2">
              Your name
              <input type="text" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
            </label>
            <label className="block font-mono font-bold uppercase text-sm space-y-2">
              Your email
              <input type="email" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
            </label>
            <label className="block font-mono font-bold uppercase text-sm space-y-2">
              Message
              <textarea rows={5} className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
            </label>
            <button
              type="button"
              className="w-full bg-foreground text-background border-2 border-border py-4 font-heading font-black text-xl uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all"
            >
              Send Transmission
            </button>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
