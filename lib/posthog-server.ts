// Server-side PostHog capture — for events that should fire even if the user
// has JS disabled or an ad-blocker (signups via OAuth callback, Stripe webhook
// conversions, etc).
//
// Safe to import in route handlers and server components. No-ops gracefully
// when NEXT_PUBLIC_POSTHOG_KEY is not set, so callers don't need to guard.

import 'server-only';
import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
    flushAt: 1, // serverless — flush every event (no batching across requests)
    flushInterval: 0,
  });
  return client;
}

/**
 * Capture a server-side event. Returns immediately; PostHog flushes
 * asynchronously. Always wrap in try/catch — analytics must never break
 * a request path.
 */
export async function captureServerEvent(opts: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({
      distinctId: opts.distinctId,
      event: opts.event,
      properties: opts.properties,
    });
    // In serverless we need to flush per call — the function may freeze.
    await ph.shutdown();
    client = null;
  } catch {
    // swallow — analytics never breaks the caller
  }
}

/**
 * Identify a user (associate properties with their distinct_id). Useful right
 * after signup or subscription change.
 */
export async function identifyServer(opts: {
  distinctId: string;
  properties: Record<string, unknown>;
}): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.identify({
      distinctId: opts.distinctId,
      properties: opts.properties,
    });
    await ph.shutdown();
    client = null;
  } catch {
    // swallow
  }
}
