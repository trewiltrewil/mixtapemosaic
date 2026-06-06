"use client";

import {
  AddressElement,
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { CheckCircle, LockKeyhole, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart, type CartItem } from "@/components/CartProvider";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const fallbackPreview = "/assets/story/hero-cassette-wall-art.webp";

type PaymentIntentPayload = {
  clientSecret?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
  error?: string;
  variant?: {
    id: string;
    label: string;
    productType: string;
    priceCents: number;
  };
};

function money(cents: number | undefined) {
  return `$${Math.round((cents ?? 0) / 100).toLocaleString("en-US")}`;
}

async function createOrUpdateIntent({
  item,
  paymentIntentId,
  email,
  shippingAddress
}: {
  item: CartItem;
  paymentIntentId?: string;
  email?: string;
  shippingAddress?: unknown;
}) {
  const response = await fetch("/api/checkout/payment-intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      item,
      paymentIntentId,
      email,
      shippingAddress
    })
  });
  const payload = (await response.json()) as PaymentIntentPayload;

  if (!response.ok || !payload.clientSecret || !payload.paymentIntentId) {
    throw new Error(payload.error ?? "Could not prepare checkout.");
  }

  return payload;
}

function CheckoutSummary({
  item,
  amountTotal,
  sticky = true
}: {
  item: CartItem | undefined;
  amountTotal?: number;
  sticky?: boolean;
}) {
  const preview = item?.previewImageDataUrl ?? fallbackPreview;
  const total = amountTotal ?? item?.priceCents ?? 0;

  return (
    <aside
      className={`bg-primary border-4 border-border p-5 lg:p-7 shadow-[10px_10px_0_0_#292929] h-fit space-y-5 ${
        sticky ? "lg:sticky lg:top-28" : ""
      }`}
    >
      <h2 className="font-heading font-black text-4xl uppercase tracking-tighter">Your Mix</h2>
      {item ? (
        <>
          <div className="bg-background border-2 border-border p-3 shadow-[4px_4px_0_0_#292929]">
            {item.previewImageDataUrl ? (
              <img src={preview} alt="Configured Mixtape Mosaic preview" className="aspect-square w-full object-cover border-2 border-border" />
            ) : (
              <Image
                src={preview}
                alt="Mixtape Mosaic product preview"
                width={584}
                height={584}
                className="aspect-square w-full object-cover border-2 border-border"
              />
            )}
          </div>
          <div className="bg-background border-2 border-border p-4 font-mono font-bold uppercase">
            <strong className="block font-heading text-xl">{item.size}</strong>
            <span className="block text-xs mt-2">{item.artworkName}</span>
            <span className="block text-xs mt-1 text-muted-foreground">{item.artworkSource === "upload" ? "Uploaded artwork" : "Curated artwork"}</span>
          </div>
        </>
      ) : (
        <div className="bg-background border-2 border-border p-4 font-mono font-bold uppercase">Your cart is empty.</div>
      )}
      <div className="grid grid-cols-2 gap-y-3 font-mono font-bold text-sm uppercase">
        <span>Subtotal</span>
        <strong className="text-right">{money(total)}</strong>
        <span>US shipping</span>
        <strong className="text-right">Free</strong>
      </div>
      <div className="border-t-4 border-border pt-4 flex justify-between font-heading font-black text-3xl uppercase">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>
      <p className="font-mono text-xs font-bold uppercase leading-5">
        Your payment starts production review. We will prepare a proof and account for natural cassette variation before making the final piece.
      </p>
    </aside>
  );
}

function StripeCheckoutForm({
  item,
  paymentIntentId,
  amountTotal,
  clientSecret
}: {
  item: CartItem;
  paymentIntentId: string;
  amountTotal?: number;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!stripe || !elements) {
      return;
    }

    const addressElement = elements.getElement(AddressElement);
    const addressValue = addressElement ? await addressElement.getValue() : null;
    if (!addressValue?.complete) {
      setError("Add a complete US shipping address before paying.");
      return;
    }

    const country = addressValue.value.address.country?.toUpperCase();
    if (country !== "US") {
      setError("Mixtape Mosaic currently ships to US addresses only.");
      return;
    }

    setStatus("Checking order details...");
    try {
      await createOrUpdateIntent({
        item,
        paymentIntentId,
        email,
        shippingAddress: addressValue.value
      });
    } catch (intentError) {
      setError(intentError instanceof Error ? intentError.message : "Could not update checkout.");
      setStatus("");
      return;
    }

    setStatus("Confirming secure payment...");
    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`
      },
      redirect: "if_required"
    });

    if (result.error) {
      setError(result.error.message ?? "Payment could not be completed.");
      setStatus("");
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      clearCart();
      router.push(`/checkout/success?payment_intent=${result.paymentIntent.id}`);
      return;
    }

    setStatus("Payment is processing. We will update the order as soon as Stripe confirms it.");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="bg-card border-4 border-border p-5 lg:p-7 shadow-[8px_8px_0_0_#292929] space-y-5">
        <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
          <span className="w-5 h-5 bg-primary border-2 border-border inline-block" />
          Contact
        </h2>
        <LinkAuthenticationElement
          onChange={(event) => {
            setEmail(event.value.email ?? "");
          }}
        />
      </div>

      <div className="bg-card border-4 border-border p-5 lg:p-7 shadow-[8px_8px_0_0_#292929] space-y-5">
        <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
          <span className="w-5 h-5 bg-accent border-2 border-border inline-block" />
          Ship To
        </h2>
        <AddressElement options={{ mode: "shipping", allowedCountries: ["US"], fields: { phone: "always" } }} />
        <p className="font-mono font-bold uppercase text-xs">Free US shipping. International checkout is coming later.</p>
      </div>

      <div className="bg-card border-4 border-border p-5 lg:p-7 shadow-[8px_8px_0_0_#292929] space-y-5">
        <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
          <span className="w-5 h-5 bg-secondary border-2 border-border inline-block" />
          Payment
        </h2>
        <PaymentElement />
      </div>

      <div className="bg-background border-2 border-border p-4 font-mono font-bold uppercase text-xs leading-5">
        By paying, you acknowledge that each Mixtape Mosaic is made from real vintage cassette tapes. Tape labels, colors,
        alignment, and tiny imperfections are part of the finished art object.
      </div>

      {error ? <p className="bg-secondary text-background border-2 border-border p-3 font-mono font-bold uppercase">{error}</p> : null}
      {status ? <p className="font-mono font-bold uppercase text-sm">{status}</p> : null}

      <button
        type="submit"
        disabled={!stripe || !elements}
        className="w-full bg-foreground text-background border-2 border-border py-4 font-heading font-black text-xl uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
      >
        <LockKeyhole className="w-6 h-6" />
        Pay {money(amountTotal)}
      </button>
    </form>
  );
}

export function CheckoutClient() {
  const { cart } = useCart();
  const item = cart[0];
  const [intent, setIntent] = useState<PaymentIntentPayload | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    if (!item || !stripePromise) {
      return;
    }

    setStatus("Preparing secure checkout...");
    createOrUpdateIntent({ item })
      .then((payload) => {
        if (active) {
          setIntent(payload);
          setStatus("");
        }
      })
      .catch((error) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : "Checkout is not available.");
        }
      });

    return () => {
      active = false;
    };
  }, [item]);

  const options = useMemo<StripeElementsOptions | null>(() => {
    if (!intent?.clientSecret) {
      return null;
    }

    return {
      clientSecret: intent.clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#F25C2A",
          colorBackground: "#FFF4E0",
          colorText: "#292929",
          colorDanger: "#F25C2A",
          fontFamily: "var(--font-mono), monospace",
          borderRadius: "0px"
        },
        rules: {
          ".Input": {
            border: "2px solid #292929",
            boxShadow: "none"
          },
          ".Tab": {
            border: "2px solid #292929",
            boxShadow: "none"
          },
          ".Tab--selected": {
            boxShadow: "4px 4px 0 #292929"
          }
        }
      }
    };
  }, [intent?.clientSecret]);

  if (!item) {
    return (
      <div className="grid lg:grid-cols-[1fr_420px] gap-12">
        <div className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
          <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            Your cart is empty
          </h2>
          <p className="font-mono font-bold uppercase text-sm">Build a mosaic first, then come back to checkout.</p>
          <Link href="/customize" className="inline-block bg-primary border-2 border-border px-5 py-3 font-heading font-black uppercase shadow-[4px_4px_0_0_#292929]">
            Start customizing
          </Link>
        </div>
        <CheckoutSummary item={undefined} />
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="grid lg:grid-cols-[1fr_420px] gap-12">
        <div className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
          <h2 className="font-heading font-black text-3xl uppercase tracking-tighter">Checkout needs Stripe keys</h2>
          <p className="font-mono font-bold uppercase text-sm">
            Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable the embedded Stripe checkout form.
          </p>
        </div>
        <CheckoutSummary item={item} />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-12">
      <div className="space-y-6">
        {options && intent?.paymentIntentId ? (
          <Elements stripe={stripePromise} options={options}>
            <StripeCheckoutForm
              item={item}
              paymentIntentId={intent.paymentIntentId}
              amountTotal={intent.amountTotal}
              clientSecret={intent.clientSecret!}
            />
          </Elements>
        ) : (
          <div className="bg-card border-4 border-border p-6 lg:p-8 shadow-[8px_8px_0_0_#292929] space-y-5">
            <h2 className="font-heading font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
              <CheckCircle className="w-8 h-8" />
              Preparing checkout
            </h2>
            <p className="font-mono font-bold uppercase text-sm">{status || "Loading secure payment form..."}</p>
          </div>
        )}
      </div>
      <CheckoutSummary item={item} amountTotal={intent?.amountTotal} />
    </div>
  );
}
