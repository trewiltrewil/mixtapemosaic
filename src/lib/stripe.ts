import Stripe from "stripe";

let cachedStripe: Stripe | null | undefined;

export function getStripe() {
  if (cachedStripe !== undefined) {
    return cachedStripe;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cachedStripe = null;
    return cachedStripe;
  }

  cachedStripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true
  });

  return cachedStripe;
}
