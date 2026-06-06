import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Hosted Checkout is disabled. Use /api/checkout/payment-intent for native Stripe Elements checkout." },
    { status: 410 }
  );
}
