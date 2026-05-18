'use server';

// Stripe Server Actions:
//   - createCheckoutSession() → starts a hosted Stripe Checkout for the
//     monthly plan, returns a URL the client redirects to.
//   - createPortalSession() → opens the Stripe Customer Portal so the user
//     can update their card, cancel, or download invoices.
//
// Both require the user to be signed in (RLS reads happen against their
// own subscriptions row).

import { headers } from 'next/headers';
import { stripe, PRICE_IDS, pickCurrency, getRevenueShareData } from '@/lib/stripe';
import { getUser } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; requiresLogin?: boolean };

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY && !!PRICE_IDS.usd;

async function appOrigin(): Promise<string> {
  // Always prefer the real request host — this is the URL the user actually
  // landed on. Falling back to NEXT_PUBLIC_APP_URL would send a production
  // visitor to localhost when the env var is misconfigured.
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  // Last-resort fallbacks (build-time, edge cases).
  return process.env.NEXT_PUBLIC_APP_URL || 'https://alluretv.net';
}

/** Resolve the customer's country from the request headers (Vercel/CDN geo). */
async function resolveCountry(): Promise<string | null> {
  const h = await headers();
  // Vercel sets x-vercel-ip-country; Cloudflare sets cf-ipcountry; both
  // are 2-letter ISO codes. Fall back to Accept-Language country segment.
  const fromVercel = h.get('x-vercel-ip-country');
  if (fromVercel) return fromVercel;
  const fromCf = h.get('cf-ipcountry');
  if (fromCf) return fromCf;
  // Accept-Language: "pt-BR,en;q=0.9" → BR
  const al = h.get('accept-language');
  const m = al?.match(/[a-z]{2,3}-([A-Z]{2})/);
  return m?.[1] ?? null;
}

/** Start a Stripe Checkout session for the monthly plan.
 *  Picks USD/BRL/EUR based on the customer's country (Vercel geo header). */
export async function createCheckoutSession(opts?: {
  /** Override currency detection — used when the UI offers a manual chooser. */
  locale?: string;
}): Promise<Result<{ url: string }>> {
  if (!STRIPE_CONFIGURED) {
    return { ok: false, error: 'Stripe is not configured yet.' };
  }
  if (!SUPABASE_CONFIGURED) {
    return { ok: false, error: 'Supabase is not configured yet.' };
  }

  const user = await getUser();
  if (!user) {
    return { ok: false, error: 'Sign in to subscribe', requiresLogin: true };
  }

  const origin = await appOrigin();

  // Pick price by country (BR → BRL, DE/FR/ES/etc → EUR, default → USD).
  const country = await resolveCountry();
  const currency = pickCurrency({ country, locale: opts?.locale ?? null });
  const priceId = PRICE_IDS[currency];

  if (!priceId) {
    return {
      ok: false,
      error: `Price for ${currency.toUpperCase()} is not configured.`,
    };
  }

  // Reuse an existing Stripe customer if we already have one for this user.
  let customerId: string | undefined;
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  } catch {
    customerId = undefined;
  }

  // Stripe Connect revenue split — when configured, every recurring invoice
  // is split between the platform account and the destination (see lib/stripe.ts).
  // Returns null if the envs aren't set, in which case the platform keeps 100%.
  const revenueShare = getRevenueShareData();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Important: this lets the webhook attach the subscription to the
      // correct Supabase user.
      client_reference_id: user.id,
      customer: customerId,
      customer_email: customerId ? undefined : user.email ?? undefined,
      // Stamp metadata on the subscription so customer.subscription.* events
      // can resolve user_id without a DB lookup. For Subscription mode the
      // Connect split goes inside subscription_data, not at the session root.
      subscription_data: {
        metadata: { user_id: user.id },
        ...(revenueShare ?? {}),
      },
      allow_promotion_codes: true,
      success_url: `${origin}/account?upgrade=success`,
      cancel_url: `${origin}/account?upgrade=canceled`,
    });

    if (!session.url) {
      return { ok: false, error: 'Stripe did not return a checkout URL' };
    }
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe] checkout session failed:', msg);
    return { ok: false, error: msg };
  }
}

/** Open the Stripe Customer Portal for the signed-in user. */
export async function createPortalSession(): Promise<Result<{ url: string }>> {
  if (!STRIPE_CONFIGURED) {
    return { ok: false, error: 'Stripe is not configured yet.' };
  }

  const user = await getUser();
  if (!user) {
    return { ok: false, error: 'Sign in to manage your subscription', requiresLogin: true };
  }

  const sb = createServiceClient();
  const { data } = await sb
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return { ok: false, error: 'No active subscription found' };
  }

  const origin = await appOrigin();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/account`,
    });
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe] portal session failed:', msg);
    return { ok: false, error: msg };
  }
}
