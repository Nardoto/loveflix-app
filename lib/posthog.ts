// PostHog client init (browser) — gated by user consent.
//
// Strategy: init with opt_out_capturing_by_default + persistence:'memory'
// so PostHog never writes a cookie or fires a single event before the user
// has chosen on the cookie banner. applyConsent() flips it on (and starts
// session recording if the user opted in to that specifically).
//
// Server-side capture lives in `lib/posthog-server.ts`.

'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import type { Consent } from './consent';

const CONSENT_EVENT = 'allure:consent-changed';

let initialized = false;

export function initPostHog(consent: Consent | null) {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Nothing is captured until applyConsent({analytics: true}) flips it.
    opt_out_capturing_by_default: true,
    // Replay stays off until applyConsent({session: true}).
    disable_session_recording: true,
    session_recording: { maskAllInputs: true },
    // Memory persistence pre-consent — no ph_* cookies are written until
    // the user agrees, at which point applyConsent switches to localStorage.
    persistence: 'memory',
  });

  initialized = true;
  if (consent) applyConsent(consent);
}

export function applyConsent(c: Consent): void {
  if (!initialized) return;
  if (c.analytics) {
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.opt_in_capturing();
    if (c.session) {
      posthog.startSessionRecording();
    } else {
      posthog.stopSessionRecording();
    }
  } else {
    posthog.opt_out_capturing();
    posthog.stopSessionRecording();
    posthog.reset();
  }
}

export function PostHogProvider({
  children,
  initialConsent,
}: {
  children: React.ReactNode;
  initialConsent: Consent | null;
}) {
  useEffect(() => {
    initPostHog(initialConsent);
  }, [initialConsent]);

  // Re-apply on consent changes from anywhere in the app (banner, modal, etc).
  useEffect(() => {
    function onChange(e: Event) {
      const next = (e as CustomEvent<Consent | null>).detail ?? null;
      if (next) applyConsent(next);
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return children;
}

export { posthog };
