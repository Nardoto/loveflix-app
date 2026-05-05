'use client';

import { useEffect, useState } from 'react';

type TokenState = {
  token: string | null;
  tier: 'active' | 'trialing' | 'free' | null;
  loading: boolean;
  error: string | null;
};

const REFRESH_BEFORE_EXPIRY_SEC = 600; // refresh 10 min before token expires

export function useMediaToken(): TokenState {
  const [state, setState] = useState<TokenState>({
    token: null,
    tier: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchToken = async () => {
      try {
        const res = await fetch('/api/media/sign-token', { cache: 'no-store' });
        if (!res.ok) {
          if (cancelled) return;
          setState({ token: null, tier: null, loading: false, error: `HTTP ${res.status}` });
          return;
        }
        const data = (await res.json()) as { token: string; tier: TokenState['tier']; expiresIn: number };
        if (cancelled) return;
        setState({ token: data.token, tier: data.tier, loading: false, error: null });
        // Schedule next refresh.
        const refreshIn = Math.max(60, data.expiresIn - REFRESH_BEFORE_EXPIRY_SEC) * 1000;
        timeoutId = setTimeout(fetchToken, refreshIn);
      } catch (err) {
        if (cancelled) return;
        setState({ token: null, tier: null, loading: false, error: String(err) });
      }
    };

    fetchToken();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

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
