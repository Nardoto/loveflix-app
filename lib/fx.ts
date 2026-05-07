// Real-time FX rates for displaying USD-equivalent MRR in the admin.
//
// Source: api.frankfurter.app — free, no API key, no rate limit.
// Rates come from the European Central Bank reference rates (the same
// dataset banks and accountants use for reporting), refreshed once a day
// around 16:00 CET on banking days.
//
// Cached for 6h via unstable_cache so we don't hit the upstream on every
// admin page load and so the build doesn't depend on network availability.
// Falls back to a hardcoded snapshot if the upstream is unreachable so
// the admin never crashes — the snapshot is always tagged with
// `source: 'fallback'` so the UI can flag it as stale.

import { unstable_cache } from 'next/cache';

export type FxRates = {
  // USD value of 1 unit of each currency.
  // e.g., brl = 0.198 means 1 BRL ≈ $0.198 (i.e., 1 USD ≈ R$5.05).
  usd: 1;
  brl: number;
  eur: number;
  // ISO date the rates were published by ECB (e.g., '2026-05-07').
  date: string;
  // 'ecb' = live data; 'fallback' = upstream failed, using static estimate.
  source: 'ecb' | 'fallback';
};

const FALLBACK: FxRates = {
  usd: 1,
  brl: 0.2,
  eur: 1.08,
  date: 'static',
  source: 'fallback',
};

async function fetchFxToUsd(): Promise<FxRates> {
  try {
    // Frankfurter returns rates "from USD to X" — i.e., how many BRL/EUR
    // you get for 1 USD. We invert to get "USD per 1 BRL/EUR" for our math.
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=BRL,EUR',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      throw new Error(`frankfurter responded ${res.status}`);
    }
    const json = (await res.json()) as {
      date: string;
      rates: { BRL?: number; EUR?: number };
    };
    const brlPerUsd = json.rates.BRL;
    const eurPerUsd = json.rates.EUR;
    if (!brlPerUsd || !eurPerUsd) {
      throw new Error('frankfurter returned incomplete rates');
    }
    return {
      usd: 1,
      brl: 1 / brlPerUsd,
      eur: 1 / eurPerUsd,
      date: json.date,
      source: 'ecb',
    };
  } catch (err) {
    console.error('[fx] frankfurter fetch failed, using fallback:', err);
    return FALLBACK;
  }
}

/**
 * Cached for 6 hours. ECB publishes rates once per banking day so that's
 * plenty of headroom — and the cache key has no inputs so a single fetch
 * serves every admin page render.
 */
export const getFxToUsd = unstable_cache(fetchFxToUsd, ['fx-to-usd'], {
  revalidate: 60 * 60 * 6,
  tags: ['fx-rates'],
});
