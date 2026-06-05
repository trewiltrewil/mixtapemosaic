import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";

type CheckoutItem = {
  size?: string;
  artworkName?: string;
  artworkSource?: string;
  priceCents?: number;
  customizationSessionId?: string;
  customerArtworkUploadId?: string;
  previewSnapshotPath?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { item?: CheckoutItem } | null;
  const item = body?.item;

  if (!item) {
    return NextResponse.json({ error: "Cart item is required." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to enable checkout." },
      { status: 503 }
    );
  }

  const baseUrl = siteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Mixtape Mosaic Custom Cassette Wall Art",
            description: `${item.size ?? "Custom size"} - ${item.artworkName ?? "Custom artwork"}`
          },
          unit_amount: item.priceCents ?? 139500
        },
        quantity: 1
      }
    ],
    metadata: {
      selected_size: item.size ?? "",
      artwork_name: item.artworkName ?? "",
      artwork_source: item.artworkSource ?? "",
      customization_session_id: item.customizationSessionId ?? "",
      customer_artwork_upload_id: item.customerArtworkUploadId ?? "",
      preview_snapshot_path: item.previewSnapshotPath ?? ""
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout?canceled=1`
  });

  return NextResponse.json({ url: session.url });
}
