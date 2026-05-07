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


// ===========================================================================
// MULTI-CURRENCY PRICING
// ===========================================================================
// We have one Stripe Product with three Prices — one per currency. The
// checkout session is created with the price_id that matches the customer's
// country/locale (resolved in app/actions/stripe.ts).
//
// All three are kept in sync visually: $14.99 USD ≈ R$79.90 BRL ≈ €13.99 EUR.
// Adjust amounts in the Stripe Dashboard if exchange rates shift; the price
// IDs themselves don't need to change.

export type SupportedCurrency = 'usd' | 'brl' | 'eur';

export const PRICE_IDS: Record<SupportedCurrency, string> = {
  usd: process.env.STRIPE_PRICE_ID_MONTHLY ?? '',
  brl: process.env.STRIPE_PRICE_ID_MONTHLY_BRL ?? '',
  eur: process.env.STRIPE_PRICE_ID_MONTHLY_EUR ?? '',
};

// Display values for the UI (kept in sync with the actual Stripe prices).
export const PRICE_DISPLAY: Record<SupportedCurrency, { amount: string; symbol: string; label: string }> = {
  usd: { amount: '14.99', symbol: '$', label: '$14.99/mo' },
  brl: { amount: '79,90', symbol: 'R$', label: 'R$79,90/mês' },
  eur: { amount: '13,99', symbol: '€', label: '€13,99/Monat' },
};

// Strikethrough "old price" used in marketing copy (psychological discount).
export const PRICE_DISPLAY_OLD: Record<SupportedCurrency, string> = {
  usd: '$19.99',
  brl: 'R$99,90',
  eur: '€18,99',
};

// Country → currency mapping. Anything not listed defaults to USD.
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  // Eurozone + countries that mostly use € for digital services
  AT: 'eur', BE: 'eur', CY: 'eur', DE: 'eur', EE: 'eur', ES: 'eur',
  FI: 'eur', FR: 'eur', GR: 'eur', IE: 'eur', IT: 'eur', LT: 'eur',
  LU: 'eur', LV: 'eur', MT: 'eur', NL: 'eur', PT: 'eur', SI: 'eur',
  SK: 'eur', AD: 'eur', MC: 'eur', SM: 'eur', VA: 'eur',
  // Brazil
  BR: 'brl',
};

// Locale → currency fallback (when we don't have a country header).
const LOCALE_TO_CURRENCY: Record<string, SupportedCurrency> = {
  de: 'eur',
  fr: 'eur',
  es: 'eur',
  en: 'usd',
};

/** Pick the right currency for this customer.
 *  Priority: country header (Vercel/CDN geo) > locale > USD fallback. */
export function pickCurrency(opts: {
  country?: string | null;
  locale?: string | null;
}): SupportedCurrency {
  const country = opts.country?.toUpperCase();
  if (country && COUNTRY_TO_CURRENCY[country]) {
    return COUNTRY_TO_CURRENCY[country];
  }
  if (opts.locale && LOCALE_TO_CURRENCY[opts.locale]) {
    return LOCALE_TO_CURRENCY[opts.locale];
  }
  return 'usd';
}

// Backwards-compat: legacy code that imports PRICE_ID_MONTHLY still works
// (it now resolves to the USD price specifically).
export const PRICE_ID_MONTHLY = PRICE_IDS.usd;
