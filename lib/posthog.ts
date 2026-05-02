// PostHog client init (browser).
// Server-side capture lives in `lib/posthog-server.ts` (created when needed).
'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Session replay (PostHog free tier includes this)
    session_recording: { maskAllInputs: true },
  });
  initialized = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);
  return children;
}

export { posthog };
