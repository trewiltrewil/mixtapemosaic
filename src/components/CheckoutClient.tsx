"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

export function CheckoutClient() {
  const { cart, cartTotalCents } = useCart();
  const [status, setStatus] = useState("");
  const item = cart[0];
  const total = Math.round(cartTotalCents / 100);

  async function checkout() {
    if (!item) {
      return;
    }

    setStatus("Creating secure checkout...");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ item })
    });
    const result = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !result.url) {
      setStatus(result.error ?? "Checkout is not configured yet.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-12">
      <div className="space-y-6">
        <div className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
          <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
            <span className="w-5 h-5 bg-primary border-2 border-border inline-block" />
            Order details
          </h2>
          <p className="font-mono font-bold uppercase text-sm">
            Stripe Checkout will collect shipping and payment details securely once Stripe test keys are added.
          </p>
          <Link href="/customize" className="inline-block bg-primary border-2 border-border px-5 py-3 font-heading font-black uppercase shadow-[4px_4px_0_0_#292929]">
            Customize another
          </Link>
        </div>
      </div>

      <aside className="bg-primary border-4 border-border p-6 lg:p-8 shadow-[10px_10px_0_0_#292929] h-fit sticky top-28 space-y-6">
        <h2 className="font-heading font-black text-4xl uppercase tracking-tighter">Your Mix</h2>
        {item ? (
          <div className="bg-background border-2 border-border p-4 flex justify-between gap-4 font-mono font-bold">
            <div>
              <strong className="block uppercase">Custom Mosaic</strong>
              <span className="text-sm">{item.size}</span>
              <span className="block text-xs mt-2">{item.artworkName}</span>
            </div>
            <strong>${Math.round(item.priceCents / 100)}</strong>
          </div>
        ) : (
          <div className="bg-background border-2 border-border p-4 font-mono font-bold uppercase">
            Your cart is empty.
          </div>
        )}
        <div className="grid grid-cols-2 gap-y-3 font-mono font-bold text-sm uppercase">
          <span>Subtotal</span>
          <strong className="text-right">${total}</strong>
          <span>Shipping</span>
          <strong className="text-right">Free</strong>
        </div>
        <div className="border-t-4 border-border pt-4 flex justify-between font-heading font-black text-3xl uppercase">
          <span>Total</span>
          <strong>${total}</strong>
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={!item}
          className="w-full bg-foreground text-background border-2 border-border py-4 font-heading font-black text-xl uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <CheckCircle className="w-6 h-6" />
          Secure Checkout
        </button>
        {status ? <p className="font-mono font-bold text-sm uppercase">{status}</p> : null}
      </aside>
    </div>
  );
}
