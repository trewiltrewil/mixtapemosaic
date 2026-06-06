import Link from "next/link";
import { CheckoutSuccessClient } from "@/components/CheckoutSuccessClient";
import { SiteFooter } from "@/components/PublicChrome";

export default function CheckoutSuccessPage() {
  return (
    <main>
      <CheckoutSuccessClient />
      <section className="bg-primary border-b-4 border-border py-24 lg:py-36">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <p className="font-mono font-bold uppercase tracking-[0.25em]">Order received</p>
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9]">
            Your proof is next.
          </h1>
          <p className="font-mono font-bold uppercase text-lg">
            Thanks for starting a Mixtape Mosaic. We will review the artwork and prepare the production proof.
          </p>
          <Link
            href="/"
            className="inline-flex bg-foreground text-background border-2 border-border px-8 py-4 font-heading font-black uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B]"
          >
            Back to site
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
