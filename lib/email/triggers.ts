// Glue layer between Stripe webhook events and email/send.ts. Each trigger
// pulls everything it needs from the event object + Supabase profile,
// resolves the user's locale and first name, formats the money/dates, and
// hands off to the typed wrapper.
//
// Wrapped in try/catch by the caller — these functions throw on data issues
// (missing email, missing user) but the webhook handler swallows.

import 'server-only';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendCancellationEmail,
  sendPaymentFailedEmail,
  sendRenewalEmail,
  sendWelcomeEmail,
} from './send';
import { localeFromCheckoutSession, localeFromCustomer } from './i18n';
import type { EmailLocale, PlanInfo } from './types';

// ── Helpers ───────────────────────────────────────────────────────────

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://alluretv.net';
}

function firstNameFromFull(full: string | null | undefined, email: string): string {
  if (full && full.trim()) return full.trim().split(/\s+/)[0];
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function loadProfile(userId: string): Promise<{
  email: string | null;
  fullName: string | null;
} | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  return { email: data.email, fullName: data.full_name };
}

async function resolveUserIdFromCustomer(customerId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

function formatMoney(amountMinor: number, currency: string, locale: EmailLocale): string {
  // amountMinor is in cents/centavos — Stripe convention.
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(localeToIntl(locale), {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(unix: number | null, locale: EmailLocale): string {
  if (!unix) return '';
  try {
    return new Intl.DateTimeFormat(localeToIntl(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(unix * 1000));
  } catch {
    return new Date(unix * 1000).toISOString().slice(0, 10);
  }
}

function localeToIntl(l: EmailLocale): string {
  switch (l) {
    case 'pt': return 'pt-BR';
    case 'es': return 'es-ES';
    case 'de': return 'de-DE';
    case 'fr': return 'fr-FR';
    default:   return 'en-US';
  }
}

function planLabelFor(locale: EmailLocale): string {
  switch (locale) {
    case 'pt': return 'Mensal';
    case 'es': return 'Mensual';
    case 'de': return 'Monatlich';
    case 'fr': return 'Mensuel';
    default:   return 'Monthly';
  }
}

function currencyEnum(c: string): 'USD' | 'BRL' | 'EUR' {
  const up = c.toUpperCase();
  if (up === 'BRL' || up === 'EUR') return up;
  return 'USD';
}

// ── Triggers ──────────────────────────────────────────────────────────

export async function triggerWelcomeFromCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id;
  if (!userId) return;

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) return; // welcome is for subscription checkouts only

  const to =
    session.customer_details?.email ??
    (await loadProfile(userId))?.email ??
    null;
  if (!to) return;

  const profile = await loadProfile(userId);
  const firstName = firstNameFromFull(
    session.customer_details?.name ?? profile?.fullName ?? null,
    to,
  );
  const locale = localeFromCheckoutSession(session);

  const amountMinor = session.amount_total ?? 0;
  const currency = currencyEnum(session.currency ?? 'usd');
  const plan: PlanInfo = {
    label: planLabelFor(locale),
    amount: formatMoney(amountMinor, currency, locale),
    currency,
  };

  const app = getAppUrl();
  await sendWelcomeEmail({
    userId,
    to,
    idempotencyKey: subscriptionId,
    props: {
      firstName,
      locale,
      plan,
      manageUrl: `${app}/account`,
      libraryUrl: `${app}/`,
      homeUrl: `${app}/`,
    },
  });
}

export async function triggerPaymentFailedFromInvoice(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId || !invoice.id) return;

  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const profile = await loadProfile(userId);

  const to =
    invoice.customer_email ??
    profile?.email ??
    (customer && !('deleted' in customer) ? customer.email : null);
  if (!to) return;

  const locale = localeFromCustomer(customer);
  const firstName = firstNameFromFull(profile?.fullName ?? null, to);
  const currency = currencyEnum(invoice.currency ?? 'usd');
  const amount = formatMoney(invoice.amount_due ?? 0, currency, locale);

  const app = getAppUrl();
  await sendPaymentFailedEmail({
    userId,
    to,
    idempotencyKey: invoice.id,
    props: {
      firstName,
      locale,
      amount,
      currency,
      manageUrl: `${app}/account`,
      billingUrl: `${app}/account`,
      homeUrl: `${app}/`,
    },
  });
}

export async function triggerCancellationFromSubscription(sub: Stripe.Subscription): Promise<void> {
  if (sub.status !== 'canceled') return;

  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  const userId =
    sub.metadata?.user_id ?? (await resolveUserIdFromCustomer(customerId));
  if (!userId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const profile = await loadProfile(userId);

  const to =
    profile?.email ??
    (customer && !('deleted' in customer) ? customer.email : null);
  if (!to) return;

  const locale = localeFromCustomer(customer);
  const firstName = firstNameFromFull(profile?.fullName ?? null, to);

  const item = sub.items.data[0];
  const accessUntil = formatDate(item?.current_period_end ?? null, locale);

  const app = getAppUrl();
  await sendCancellationEmail({
    userId,
    to,
    idempotencyKey: sub.id,
    props: {
      firstName,
      locale,
      accessUntil,
      manageUrl: `${app}/account`,
      reactivateUrl: `${app}/account`,
      homeUrl: `${app}/`,
    },
  });
}

export async function triggerRenewalFromInvoice(invoice: Stripe.Invoice): Promise<void> {
  // Only renewals — Stripe's first paid invoice has billing_reason='subscription_create',
  // which we already cover with the welcome email.
  if (invoice.billing_reason !== 'subscription_cycle') return;
  if (invoice.status !== 'paid') return;

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId || !invoice.id) return;

  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const profile = await loadProfile(userId);

  const to =
    invoice.customer_email ??
    profile?.email ??
    (customer && !('deleted' in customer) ? customer.email : null);
  if (!to) return;

  const locale = localeFromCustomer(customer);
  const firstName = firstNameFromFull(profile?.fullName ?? null, to);
  const currency = currencyEnum(invoice.currency ?? 'usd');
  const amount = formatMoney(invoice.amount_paid ?? 0, currency, locale);
  const nextBilling = formatDate(invoice.period_end ?? null, locale);

  const app = getAppUrl();
  await sendRenewalEmail({
    userId,
    to,
    idempotencyKey: invoice.id,
    props: {
      firstName,
      locale,
      amount,
      currency,
      nextBillingDate: nextBilling,
      manageUrl: `${app}/account`,
      libraryUrl: `${app}/`,
      homeUrl: `${app}/`,
    },
  });
}
