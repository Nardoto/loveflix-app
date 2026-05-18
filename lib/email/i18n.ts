// Pick the email locale for a given Stripe session.
//
// Priority order:
//   1. session.locale  — the user picked it during checkout (most reliable)
//   2. customer country — maps via COUNTRY_TO_LOCALE
//   3. fallback to EN
//
// Returns one of EMAIL_LOCALES — never the raw 2-letter input.

import type Stripe from 'stripe';
import { type EmailLocale, EMAIL_LOCALE_FALLBACK, EMAIL_LOCALES } from './types';

const COUNTRY_TO_LOCALE: Record<string, EmailLocale> = {
  BR: 'pt', PT: 'pt',
  US: 'en', GB: 'en', CA: 'en', AU: 'en', IE: 'en', NZ: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', BE: 'fr', LU: 'fr',
};

const STRIPE_LOCALE_TO_EMAIL: Record<string, EmailLocale> = {
  'pt': 'pt', 'pt-BR': 'pt',
  'en': 'en', 'en-US': 'en', 'en-GB': 'en',
  'es': 'es', 'es-419': 'es',
  'de': 'de',
  'fr': 'fr', 'fr-CA': 'fr',
};

export function detectEmailLocale(opts: {
  stripeLocale?: string | null;
  country?: string | null;
}): EmailLocale {
  const sl = opts.stripeLocale?.toLowerCase();
  if (sl && STRIPE_LOCALE_TO_EMAIL[sl]) return STRIPE_LOCALE_TO_EMAIL[sl];
  if (sl) {
    const base = sl.split('-')[0];
    if (STRIPE_LOCALE_TO_EMAIL[base]) return STRIPE_LOCALE_TO_EMAIL[base];
  }
  const country = opts.country?.toUpperCase();
  if (country && COUNTRY_TO_LOCALE[country]) return COUNTRY_TO_LOCALE[country];
  return EMAIL_LOCALE_FALLBACK;
}

/** Detect locale from a Stripe Checkout session. */
export function localeFromCheckoutSession(
  session: Stripe.Checkout.Session,
): EmailLocale {
  return detectEmailLocale({
    stripeLocale: session.locale,
    country: session.customer_details?.address?.country,
  });
}

/** Detect locale from a Stripe Customer (used by invoice events that don't carry locale). */
export function localeFromCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer | string | null,
): EmailLocale {
  if (!customer || typeof customer === 'string') return EMAIL_LOCALE_FALLBACK;
  if ('deleted' in customer && customer.deleted) return EMAIL_LOCALE_FALLBACK;
  const c = customer as Stripe.Customer;
  return detectEmailLocale({
    stripeLocale: c.preferred_locales?.[0],
    country: c.address?.country ?? c.shipping?.address?.country,
  });
}

export function isSupportedLocale(s: string): s is EmailLocale {
  return (EMAIL_LOCALES as readonly string[]).includes(s);
}
