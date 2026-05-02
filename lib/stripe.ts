// Stripe server SDK
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features will be disabled');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
});

export const PRICE_DISPLAY = 14.99;
export const PRICE_DISPLAY_OLD = 19.99; // strikethrough for psychological discount

// Price IDs come from Stripe Dashboard once products are created.
// Add these to .env.local after creating products.
export const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY ?? '';
