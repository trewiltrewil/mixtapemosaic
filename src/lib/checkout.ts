import type Stripe from "stripe";
import { getProductVariant, isUuid, metadataFromCheckoutItem, mixtapeBrand, type CheckoutItemInput, type ProductVariant } from "./commerce";
import { getStripe } from "./stripe";
import { getSupabaseAdminClient } from "./supabase";

export type StripeShippingAddressInput = {
  name?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

export function normalizeEmail(email: string | null | undefined) {
  const trimmed = email?.trim().toLowerCase();
  return trimmed && trimmed.includes("@") ? trimmed : null;
}

export function normalizeShippingAddress(value: StripeShippingAddressInput | null | undefined) {
  if (!value?.address) {
    return null;
  }

  return {
    name: value.name?.trim() || "Mixtape Mosaic Customer",
    phone: value.phone?.trim() || undefined,
    address: {
      line1: value.address.line1?.trim() || undefined,
      line2: value.address.line2?.trim() || undefined,
      city: value.address.city?.trim() || undefined,
      state: value.address.state?.trim() || undefined,
      postal_code: value.address.postal_code?.trim() || undefined,
      country: value.address.country?.trim() || undefined
    }
  } satisfies Stripe.PaymentIntentCreateParams.Shipping;
}

export function assertUsShipping(shipping: ReturnType<typeof normalizeShippingAddress>) {
  const country = shipping?.address.country?.toUpperCase();
  if (country && country !== "US") {
    throw new Error("Mixtape Mosaic checkout currently supports US shipping only.");
  }
}

export async function getOrCreateBrandStripeCustomer(email: string) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const supabase = getSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  if (supabase) {
    const { data } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("brand_id", mixtapeBrand.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (data?.stripe_customer_id) {
      return data.stripe_customer_id as string;
    }
  }

  const customer = await stripe.customers.create({
    email: normalizedEmail,
    metadata: {
      brand_id: mixtapeBrand.id,
      brand: mixtapeBrand.name,
      source: mixtapeBrand.source
    }
  });

  if (supabase) {
    await supabase.from("customers").upsert(
      {
        brand_id: mixtapeBrand.id,
        email: normalizedEmail,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "brand_id,email" }
    );
  }

  return customer.id;
}

export function checkoutOrderPayload({
  item,
  paymentIntent,
  variant,
  email,
  shipping,
  status,
  failureMessage
}: {
  item: CheckoutItemInput;
  paymentIntent: Stripe.PaymentIntent;
  variant?: ProductVariant;
  email?: string | null;
  shipping?: Stripe.PaymentIntentCreateParams.Shipping | null;
  status: string;
  failureMessage?: string | null;
}) {
  const trustedVariant = variant ?? getProductVariant(item);
  const metadata = metadataFromCheckoutItem(item, trustedVariant);

  return {
    brand_id: mixtapeBrand.id,
    stripe_customer_id:
      typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id ?? null,
    stripe_payment_intent_id: paymentIntent.id,
    customization_session_id: isUuid(item.customizationSessionId) ? item.customizationSessionId : null,
    customer_artwork_upload_id: isUuid(item.customerArtworkUploadId) ? item.customerArtworkUploadId : null,
    preview_snapshot_key: item.previewSnapshotKey ?? item.previewSnapshotPath ?? null,
    email: normalizeEmail(email) ?? paymentIntent.receipt_email ?? null,
    amount_total: trustedVariant.priceCents,
    currency: "usd",
    status,
    shipping_address: shipping ?? {},
    failure_message: failureMessage ?? null,
    metadata,
    updated_at: new Date().toISOString()
  };
}
