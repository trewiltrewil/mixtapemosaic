import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isUuid, mixtapeBrand } from "@/lib/commerce";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

function stringId(value: string | { id: string } | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function isMixtapeMosaicMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.brand_id === mixtapeBrand.id || metadata?.source === mixtapeBrand.source;
}

async function upsertPaymentIntentOrder({
  paymentIntent,
  status,
  failureMessage
}: {
  paymentIntent: Stripe.PaymentIntent;
  status: "succeeded" | "failed";
  failureMessage?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const metadata = paymentIntent.metadata ?? {};
  if (!isMixtapeMosaicMetadata(metadata)) {
    return;
  }

  await supabase.from("orders").upsert(
    {
      brand_id: metadata.brand_id,
      stripe_customer_id: stringId(paymentIntent.customer),
      stripe_payment_intent_id: paymentIntent.id,
      customization_session_id: isUuid(metadata.customization_session_id) ? metadata.customization_session_id : null,
      artwork_image_asset_id: isUuid(metadata.artwork_image_asset_id) ? metadata.artwork_image_asset_id : null,
      customer_artwork_upload_id: isUuid(metadata.customer_artwork_upload_id)
        ? metadata.customer_artwork_upload_id
        : null,
      preview_snapshot_key: metadata.preview_snapshot_key || null,
      email: paymentIntent.receipt_email ?? metadata.customer_email ?? null,
      amount_total: paymentIntent.amount_received || paymentIntent.amount,
      currency: paymentIntent.currency,
      status,
      shipping_address: paymentIntent.shipping ?? {},
      failure_message: failureMessage ?? paymentIntent.last_payment_error?.message ?? null,
      metadata,
      updated_at: new Date().toISOString()
    },
    { onConflict: "stripe_payment_intent_id" }
  );
}

async function upsertCheckoutSessionOrder(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const metadata = session.metadata ?? {};
  if (!isMixtapeMosaicMetadata(metadata)) {
    return;
  }

  await supabase.from("orders").upsert(
    {
      brand_id: metadata.brand_id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: stringId(session.payment_intent),
      stripe_customer_id: stringId(session.customer),
      customization_session_id: isUuid(metadata.customization_session_id) ? metadata.customization_session_id : null,
      artwork_image_asset_id: isUuid(metadata.artwork_image_asset_id) ? metadata.artwork_image_asset_id : null,
      customer_artwork_upload_id: isUuid(metadata.customer_artwork_upload_id)
        ? metadata.customer_artwork_upload_id
        : null,
      preview_snapshot_key: metadata.preview_snapshot_key || metadata.preview_snapshot_path || null,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      metadata,
      updated_at: new Date().toISOString()
    },
    { onConflict: "stripe_payment_intent_id" }
  );
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    await upsertPaymentIntentOrder({
      paymentIntent: event.data.object as Stripe.PaymentIntent,
      status: "succeeded"
    });
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await upsertPaymentIntentOrder({
      paymentIntent,
      status: "failed",
      failureMessage: paymentIntent.last_payment_error?.message ?? "Payment failed."
    });
  }

  if (event.type === "checkout.session.completed") {
    await upsertCheckoutSessionOrder(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
