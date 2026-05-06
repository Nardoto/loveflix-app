// Stripe server SDK — lazy-initialized so the build doesn't crash when
// STRIPE_SECRET_KEY is missing (which is normal during cold builds before
// env vars land in the deploy).
import Stripe from 'stripe';

let cached: Stripe | null = null;

function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Throwing here only happens at runtime in code paths that try to use
    // Stripe — never at build-time module load — so the build keeps passing
    // even when Stripe isn't wired up yet.
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local and the Vercel project.',
    );
  }

  cached = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  });
  return cached;
}

// Re-export as a Proxy so existing imports `import { stripe } from '@/lib/stripe'`
// keep working — the underlying SDK is still resolved lazily on first use.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const PRICE_DISPLAY = 14.99;
export const PRICE_DISPLAY_OLD = 19.99; // strikethrough for psychological discount

export const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY ?? '';
