import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { checkoutOrderPayload, getOrCreateBrandStripeCustomer, normalizeEmail, normalizeShippingAddress, assertUsShipping } from "@/lib/checkout";
import { getProductVariant, metadataFromCheckoutItem, type CheckoutItemInput } from "@/lib/commerce";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type PaymentIntentRequest = {
  item?: CheckoutItemInput;
  paymentIntentId?: string;
  email?: string;
  shippingAddress?: Parameters<typeof normalizeShippingAddress>[0];
};

function publicVariant(variant: ReturnType<typeof getProductVariant>) {
  return {
    id: variant.id,
    label: variant.label,
    productType: variant.productType,
    priceCents: variant.priceCents
  };
}

async function savePendingOrder({
  item,
  paymentIntent,
  email,
  shipping
}: {
  item: CheckoutItemInput;
  paymentIntent: Stripe.PaymentIntent;
  email?: string | null;
  shipping?: Stripe.PaymentIntentCreateParams.Shipping | null;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from("orders").upsert(checkoutOrderPayload({ item, paymentIntent, email, shipping, status: "pending" }), {
    onConflict: "stripe_payment_intent_id"
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PaymentIntentRequest | null;
  const item = body?.item;

  if (!item) {
    return NextResponse.json({ error: "Cart item is required." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable checkout." },
      { status: 503 }
    );
  }

  const variant = getProductVariant(item);
  const email = normalizeEmail(body?.email);
  const shipping = normalizeShippingAddress(body?.shippingAddress);

  try {
    assertUsShipping(shipping);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid shipping address." }, { status: 400 });
  }

  const stripeCustomerId = email ? await getOrCreateBrandStripeCustomer(email) : null;
  const metadata = {
    ...metadataFromCheckoutItem(item),
    customer_email: email ?? ""
  };

  let paymentIntent: Stripe.PaymentIntent;
  if (body?.paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(body.paymentIntentId);
    if (["succeeded", "canceled", "processing"].includes(existing.status)) {
      return NextResponse.json({ error: "This payment is already being processed." }, { status: 409 });
    }

    paymentIntent = await stripe.paymentIntents.update(body.paymentIntentId, {
      amount: variant.priceCents,
      metadata,
      receipt_email: email ?? undefined,
      customer: stripeCustomerId ?? undefined,
      shipping: shipping ?? undefined
    });
  } else {
    paymentIntent = await stripe.paymentIntents.create({
      amount: variant.priceCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      capture_method: "automatic",
      description: `Mixtape Mosaic ${variant.productType}`,
      metadata,
      receipt_email: email ?? undefined,
      customer: stripeCustomerId ?? undefined,
      shipping: shipping ?? undefined
    });
  }

  await savePendingOrder({ item, paymentIntent, email, shipping });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountTotal: variant.priceCents,
    currency: "usd",
    variant: publicVariant(variant)
  });
}
