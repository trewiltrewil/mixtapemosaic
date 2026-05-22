import { CheckoutClient } from "@/components/CheckoutClient";
import { SiteFooter } from "@/components/PublicChrome";

export default function CheckoutPage() {
  return (
    <main>
      <section className="bg-background py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9] mb-12">
            Checkout
          </h1>
          <CheckoutClient />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
