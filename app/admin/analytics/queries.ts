// Server-only data layer for /admin/analytics.
// Uses service-role client because all aggregate counts need to bypass RLS.

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import { PRICE_DISPLAY, type SupportedCurrency } from '@/lib/stripe';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DAY = 24 * 60 * 60 * 1000;

// Map a Stripe price_id back to the USD-equivalent monthly amount so we can
// sum MRR across currencies. Numbers mirror PRICE_DISPLAY in lib/stripe.ts.
const MRR_USD_BY_CURRENCY: Record<SupportedCurrency, number> = {
  usd: 14.99,
  brl: 15.0, // R$79.90 ≈ $15 — close enough for an internal estimate
  eur: 15.0, // €13.99 ≈ $15
};

function priceIdToCurrency(priceId: string | null): SupportedCurrency | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY_BRL) return 'brl';
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY_EUR) return 'eur';
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'usd';
  return null;
}

export interface AnalyticsSnapshot {
  configured: boolean;
  totals: {
    users: number;
    activeSubscribers: number;
    mrrUsd: number;
    signups7d: number;
    signupsPrev7d: number;
    subscribers7d: number;
    subscribersPrev7d: number;
    cancelled30d: number;
    comments7d: number;
  };
  byCurrency: Record<SupportedCurrency, number>; // active subs in each currency
  signupsDaily: { date: string; count: number }[]; // last 30 days
  topStories: { slug: string; title: string; comments: number }[];
  posthog: {
    configured: boolean;
    projectKey: string | null;
    host: string;
  };
}

export async function loadAnalytics(): Promise<AnalyticsSnapshot> {
  const posthog = {
    configured: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    projectKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
  };

  if (!SUPABASE_CONFIGURED) {
    return {
      configured: false,
      totals: emptyTotals(),
      byCurrency: { usd: 0, brl: 0, eur: 0 },
      signupsDaily: emptyDaily(),
      topStories: [],
      posthog,
    };
  }

  const sb = createServiceClient();
  const now = Date.now();
  const iso7 = new Date(now - 7 * DAY).toISOString();
  const iso14 = new Date(now - 14 * DAY).toISOString();
  const iso30 = new Date(now - 30 * DAY).toISOString();

  const [
    usersTotal,
    signups7,
    signupsPrev7,
    subsAll,
    subs7,
    subsPrev7,
    cancelled30,
    comments7,
    topStories,
    signupsRaw,
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso7),
    sb
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso14)
      .lt('created_at', iso7),
    sb
      .from('subscriptions')
      .select('status, price_id, current_period_end'),
    sb
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', iso7)
      .in('status', ['active', 'trialing']),
    sb
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', iso14)
      .lt('updated_at', iso7)
      .in('status', ['active', 'trialing']),
    sb
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', iso30)
      .eq('status', 'canceled'),
    sb
      .from('story_comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', iso7),
    sb
      .from('story_comments')
      .select('story_slug')
      .gte('created_at', iso30),
    sb
      .from('profiles')
      .select('created_at')
      .gte('created_at', new Date(now - 30 * DAY).toISOString())
      .order('created_at', { ascending: true }),
  ]);

  // Active subs = active OR trialing OR canceled-but-still-paid
  const activeRows = (subsAll.data ?? []).filter((r) => {
    if (r.status === 'active' || r.status === 'trialing') return true;
    if (r.status === 'canceled' && r.current_period_end) {
      return new Date(r.current_period_end as string).getTime() > now;
    }
    return false;
  });

  const byCurrency: Record<SupportedCurrency, number> = { usd: 0, brl: 0, eur: 0 };
  let mrrUsd = 0;
  for (const r of activeRows) {
    const cur = priceIdToCurrency(r.price_id as string | null);
    if (cur) {
      byCurrency[cur] += 1;
      mrrUsd += MRR_USD_BY_CURRENCY[cur];
    }
  }

  const topStoriesMap = new Map<string, number>();
  for (const row of topStories.data ?? []) {
    const slug = (row as { story_slug: string }).story_slug;
    topStoriesMap.set(slug, (topStoriesMap.get(slug) ?? 0) + 1);
  }
  const topStoriesArr = [...topStoriesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, comments]) => ({ slug, title: slug, comments }));

  const dailyMap = new Map<string, number>();
  // seed all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY).toISOString().slice(0, 10);
    dailyMap.set(d, 0);
  }
  for (const row of signupsRaw.data ?? []) {
    const day = (row as { created_at: string }).created_at.slice(0, 10);
    if (dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }
  }
  const signupsDaily = [...dailyMap.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  return {
    configured: true,
    totals: {
      users: usersTotal.count ?? 0,
      activeSubscribers: activeRows.length,
      mrrUsd: Math.round(mrrUsd * 100) / 100,
      signups7d: signups7.count ?? 0,
      signupsPrev7d: signupsPrev7.count ?? 0,
      subscribers7d: subs7.count ?? 0,
      subscribersPrev7d: subsPrev7.count ?? 0,
      cancelled30d: cancelled30.count ?? 0,
      comments7d: comments7.count ?? 0,
    },
    byCurrency,
    signupsDaily,
    topStories: topStoriesArr,
    posthog,
  };
}

function emptyTotals() {
  return {
    users: 0,
    activeSubscribers: 0,
    mrrUsd: 0,
    signups7d: 0,
    signupsPrev7d: 0,
    subscribers7d: 0,
    subscribersPrev7d: 0,
    cancelled30d: 0,
    comments7d: 0,
  };
}

function emptyDaily() {
  const out: { date: string; count: number }[] = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    out.push({
      date: new Date(now - i * DAY).toISOString().slice(0, 10),
      count: 0,
    });
  }
  return out;
}

export function deltaPercent(curr: number, prev: number): {
  text: string;
  tone: 'up' | 'down' | 'neutral';
} {
  if (prev === 0 && curr === 0) return { text: 'sem variação', tone: 'neutral' };
  if (prev === 0) return { text: `+${curr} novos`, tone: 'up' };
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return { text: 'estável', tone: 'neutral' };
  return {
    text: `${pct > 0 ? '+' : ''}${pct}% vs 7d anterior`,
    tone: pct > 0 ? 'up' : 'down',
  };
}
