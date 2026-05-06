'use client';

// Registers the service worker on mount and renders the install banner.
// The InstallProvider higher up in the tree owns the actual install
// state; this component is just the side-effect host.
//
// The service worker is what makes Chrome surface "Install app" instead
// of "Add to home screen" (the latter is just a Chrome bookmark with
// the URL bar still showing).

import { useEffect } from 'react';
import { InstallBanner } from './InstallBanner';

export function PWASupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* non-fatal: usually an expired secure context (HTTP) */
    });
  }, []);

  return <InstallBanner />;
}
