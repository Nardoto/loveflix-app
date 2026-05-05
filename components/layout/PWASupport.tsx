'use client';

// One-line client component that registers the service worker on mount and
// renders the install banner. Mounted once at the locale layout level.
//
// The service worker is what makes Chrome surface "Install app" instead of
// "Add to home screen" (the latter is just a Chrome bookmark with the URL
// bar still showing). The banner gates on visit count + delay so it never
// pops on the first visit.

import { useEffect } from 'react';
import { InstallBanner } from './InstallBanner';

export function PWASupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Register passively — failure is non-fatal (user can still browse).
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        /* swallow — most likely an expired secure context (HTTP) */
      });
  }, []);

  return <InstallBanner />;
}
