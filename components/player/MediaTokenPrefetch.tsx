'use client';

import { useEffect } from 'react';
import { prefetchToken } from '@/lib/hooks/useMediaToken';

/**
 * Renders nothing. Side effect: kicks /api/media/sign-token in the background
 * on mount so that when the user clicks "Watch" the token is already cached
 * in the module-level fetchOnce() promise and Player.tsx can set <video src>
 * without a 50-150ms wait.
 *
 * Mount on pages that lead into the player (e.g. story detail). Safe to mount
 * even when the user is signed out — the fetch will 401 and the cache is
 * cleared so a later signed-in retry still works.
 */
export function MediaTokenPrefetch({ slug }: { slug?: string }) {
  useEffect(() => {
    prefetchToken(slug);
  }, [slug]);
  return null;
}
