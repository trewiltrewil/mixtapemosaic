import { CheckCircle } from "lucide-react";
import { SiteFooter } from "@/components/PublicChrome";

export default function CheckoutPage() {
  return (
    <main>
      <section className="bg-background py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter leading-[0.9] mb-12">
            Checkout
          </h1>
          <div className="grid lg:grid-cols-[1fr_420px] gap-12">
            <div className="space-y-6">
              <form className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
                <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-5 h-5 bg-primary border-2 border-border inline-block" />
                  Shipping Info
                </h2>
                <label className="block font-mono font-bold uppercase text-sm space-y-2">
                  Full name
                  <input type="text" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                </label>
                <label className="block font-mono font-bold uppercase text-sm space-y-2">
                  Address
                  <input type="text" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                </label>
                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block font-mono font-bold uppercase text-sm space-y-2">
                    City
                    <input type="text" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                  </label>
                  <label className="block font-mono font-bold uppercase text-sm space-y-2">
                    Zip / Postal
                    <input type="text" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                  </label>
                </div>
              </form>
              <form className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
                <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-5 h-5 bg-secondary border-2 border-border inline-block" />
                  Payment Info
                </h2>
                <label className="block font-mono font-bold uppercase text-sm space-y-2">
                  Card number
                  <input type="text" placeholder="0000 0000 0000 0000" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                </label>
                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block font-mono font-bold uppercase text-sm space-y-2">
                    Expiry
                    <input type="text" placeholder="MM/YY" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                  </label>
                  <label className="block font-mono font-bold uppercase text-sm space-y-2">
                    CVC
                    <input type="text" placeholder="123" className="w-full border-2 border-border bg-background px-4 py-3 focus:outline-none focus:bg-primary/20" />
                  </label>
                </div>
              </form>
            </div>

            <aside className="bg-primary border-4 border-border p-6 lg:p-8 shadow-[10px_10px_0_0_#292929] h-fit sticky top-28 space-y-6">
              <h2 className="font-heading font-black text-4xl uppercase tracking-tighter">Your Mix</h2>
              <div className="bg-background border-2 border-border p-4 flex justify-between gap-4 font-mono font-bold">
                <div>
                  <strong className="block uppercase">Custom Mosaic</strong>
                  <span className="text-sm">Square (27&quot;x27&quot;)</span>
                </div>
                <strong>$1395</strong>
              </div>
              <div className="grid grid-cols-2 gap-y-3 font-mono font-bold text-sm uppercase">
                <span>Subtotal</span>
                <strong className="text-right">$1395</strong>
                <span>Shipping</span>
                <strong className="text-right">Free</strong>
              </div>
              <div className="border-t-4 border-border pt-4 flex justify-between font-heading font-black text-3xl uppercase">
                <span>Total</span>
                <strong>$1395</strong>
              </div>
              <button
                type="button"
                className="w-full bg-foreground text-background border-2 border-border py-4 font-heading font-black text-xl uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                Place Order
              </button>
            </aside>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
