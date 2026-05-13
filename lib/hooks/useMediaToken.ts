'use client';

import { useEffect, useState } from 'react';

type Tier = 'active' | 'trialing' | 'free' | null;

type TokenData = {
  token: string;
  tier: Tier;
  expiresIn: number;
};

type TokenState = {
  token: string | null;
  tier: Tier;
  loading: boolean;
  error: string | null;
};

const REFRESH_BEFORE_EXPIRY_SEC = 600; // refresh 10 min before token expires

// Module-level cache. Storyless tokens (default subscription tier) share
// one slot; per-slug tokens (free stories) get their own slot keyed by
// slug. That way a free story's token never poisons the global tier
// token and vice-versa.
const cache = new Map<string, { promise: Promise<TokenData>; expiresAt: number }>();
const STORYLESS = '__default__';

function fetchOnce(slug?: string): Promise<TokenData> {
  const cacheKey = slug ?? STORYLESS;
  const entry = cache.get(cacheKey);
  if (entry && Date.now() < entry.expiresAt - REFRESH_BEFORE_EXPIRY_SEC * 1000) {
    return entry.promise;
  }
  const url = slug
    ? `/api/media/sign-token?slug=${encodeURIComponent(slug)}`
    : '/api/media/sign-token';
  const promise = fetch(url, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as TokenData;
  });
  // Reserva o slot otimisticamente pra deduplicar callers concorrentes;
  // expiresAt é corrigido quando a resposta chega. Em erro, dropa o slot
  // pra próxima chamada re-tentar (evita Promise.reject "envenenado").
  cache.set(cacheKey, { promise, expiresAt: Date.now() + 60_000 });
  promise.then(
    (data) => {
      cache.set(cacheKey, {
        promise: Promise.resolve(data),
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
    },
    () => {
      cache.delete(cacheKey);
    },
  );
  return promise;
}

/**
 * Fire-and-forget token fetch. Mount <MediaTokenPrefetch /> on pages that
 * lead into the player (e.g. story detail) so the token is ready before
 * the user clicks Watch — eliminates the 50-150ms src-less delay.
 *
 * Passa o slug pra pré-carregar o token scoped da story (útil pra free
 * stories — o anônimo já chega no Player com token válido).
 */
export function prefetchToken(slug?: string): void {
  fetchOnce(slug).catch(() => {});
}

/**
 * @param slug Slug opcional. Quando passado, busca um token scoped pra
 *             aquela story. Necessário pra stories `is_free=true` (libera
 *             playback pra anônimos/não-assinantes via keyPrefix claim).
 */
export function useMediaToken(slug?: string): TokenState {
  const [state, setState] = useState<TokenState>({
    token: null,
    tier: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      fetchOnce(slug)
        .then((data) => {
          if (cancelled) return;
          setState({ token: data.token, tier: data.tier, loading: false, error: null });
          const refreshIn = Math.max(60, data.expiresIn - REFRESH_BEFORE_EXPIRY_SEC) * 1000;
          timeoutId = setTimeout(load, refreshIn);
        })
        .catch((err) => {
          if (cancelled) return;
          setState({ token: null, tier: null, loading: false, error: String(err) });
        });
    };

    load();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [slug]);

  return state;
}

/** Build a media URL targeted at the playback Worker, with the token attached. */
export function mediaUrl(key: string, token: string | null): string {
  const domain = process.env.NEXT_PUBLIC_MEDIA_DOMAIN;
  if (!domain) {
    throw new Error('NEXT_PUBLIC_MEDIA_DOMAIN not set');
  }
  const base = `https://${domain}/${key.replace(/^\/+/, '')}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
