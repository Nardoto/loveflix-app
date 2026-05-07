// Stripe webhook — receives subscription lifecycle events and mirrors them
// into the public.subscriptions table in Supabase.
//
// Stripe Dashboard → Developers → Webhooks → Add endpoint
//   URL:    https://alluretv.net/api/stripe/webhook
//   Events: checkout.session.completed
//           customer.subscription.updated
//           customer.subscription.deleted
//           invoice.payment_succeeded
//           invoice.payment_failed
//
// Verification uses the signing secret (STRIPE_WEBHOOK_SECRET, whsec_...).
// Stripe REQUIRES the raw request body — Next.js gives us that via .text().

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs'; // Edge runtime can't use the Stripe SDK
export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 },
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[stripe webhook] signature verification failed:', msg);
    return NextResponse.json({ error: `Bad signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await onSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await onInvoiceEvent(event.data.object as Stripe.Invoice);
        break;

      default:
        // Other events are ignored on purpose — log and 200 OK so Stripe
        // doesn't keep retrying.
        console.log('[stripe webhook] ignored event:', event.type);
    }
  } catch (err) {
    console.error('[stripe webhook] handler crashed:', err);
    // Return 500 so Stripe retries — but only for genuine handler bugs.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Reach this when a user finishes the Stripe-hosted checkout for the first
  // time. We stash the user_id in client_reference_id so we can attach the
  // Stripe customer/subscription back to the Supabase user row.
  const userId = session.client_reference_id;
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!userId || !customerId) {
    console.warn(
      '[stripe webhook] checkout.session.completed missing user_id or customer',
      { userId, customerId },
    );
    return;
  }

  // Upsert a placeholder row — full state lands when customer.subscription.*
  // fires right after.
  const sb = createServiceClient();
  const { error } = await sb.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId ?? null,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    // Surface in Vercel logs so a missing GRANT or RLS issue stops being
    // silent — the previous behavior swallowed it and Stripe got a 200.
    console.error('[stripe webhook] checkout upsert failed:', error);
    throw new Error(`subscriptions upsert failed: ${error.message}`);
  }
}

async function onSubscriptionEvent(sub: Stripe.Subscription) {
  // Resolve the Supabase user_id either from the metadata we set at checkout
  // creation, or by looking up the customer record.
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId =
    sub.metadata?.user_id ??
    (await resolveUserIdFromCustomer(customerId));

  if (!userId) {
    console.warn(
      '[stripe webhook] subscription event without user_id',
      sub.id,
    );
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  const sb = createServiceClient();
  const { error } = await sb.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: priceId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_end: trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('[stripe webhook] subscription upsert failed:', error);
    throw new Error(`subscriptions upsert failed: ${error.message}`);
  }
}

async function onInvoiceEvent(invoice: Stripe.Invoice) {
  // Invoice events are mostly informational — the source of truth for status
  // is `customer.subscription.updated`, which fires alongside. We use these
  // only to flag past_due / unpaid early when payment fails repeatedly.
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;

  const sb = createServiceClient();

  if (invoice.status === 'paid') {
    const { error } = await sb
      .from('subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) {
      console.error('[stripe webhook] invoice→active update failed:', error);
      throw new Error(`subscriptions update failed: ${error.message}`);
    }
  } else if (
    invoice.status === 'open' ||
    invoice.status === 'uncollectible'
  ) {
    const { error } = await sb
      .from('subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) {
      console.error('[stripe webhook] invoice→past_due update failed:', error);
      throw new Error(`subscriptions update failed: ${error.message}`);
    }
  }
}

async function resolveUserIdFromCustomer(
  customerId: string,
): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
