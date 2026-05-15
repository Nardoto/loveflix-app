// Cookie consent — types, constants, parsing, and cookie I/O.
//
// Storage: a single first-party cookie `allure_consent` carrying a JSON blob.
// Cookie (not localStorage) so the server can read it and decide whether to
// render the banner without a flash of unconsented content.
//
// Versioned: bumping CONSENT_VERSION invalidates older cookies and forces
// every visitor through the banner again — use it when categories change.
//
// This module is environment-neutral on purpose:
//   - server components (consent-server.ts) re-export parseConsent
//   - client components import readConsent/writeConsent/etc directly
//   - the React hook lives in lib/use-consent.ts (marked 'use client')

export const CONSENT_COOKIE = 'allure_consent';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 6 months (GDPR re-consent window)

export interface Consent {
  v: 1;
  analytics: boolean;
  session: boolean;
  ts: string; // ISO timestamp of the user's decision
}

export type ConsentChoice = Pick<Consent, 'analytics' | 'session'>;

export const CONSENT_ALL: ConsentChoice = { analytics: true, session: true };
export const CONSENT_ESSENTIAL: ConsentChoice = { analytics: false, session: false };

export const CONSENT_EVENT = 'allure:consent-changed';
export const OPEN_PREFERENCES_EVENT = 'allure:open-preferences';

export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as Partial<Consent>;
    if (parsed.v !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== 'boolean') return null;
    if (typeof parsed.session !== 'boolean') return null;
    if (typeof parsed.ts !== 'string') return null;
    return {
      v: CONSENT_VERSION,
      analytics: parsed.analytics,
      session: parsed.session,
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return parseConsent(match.slice(CONSENT_COOKIE.length + 1));
}

export function writeConsent(choice: ConsentChoice): Consent {
  const value: Consent = {
    v: CONSENT_VERSION,
    analytics: choice.analytics,
    session: choice.session && choice.analytics, // session implies analytics
    ts: new Date().toISOString(),
  };
  if (typeof document !== 'undefined') {
    const encoded = encodeURIComponent(JSON.stringify(value));
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${CONSENT_COOKIE}=${encoded}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
  }
  return value;
}

export function clearConsent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

export function openPreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

/**
 * Honoring the legacy Do Not Track signal. Used as a *hint* — never as
 * implicit consent under GDPR (the spec explicitly requires affirmative
 * action), but we pre-select "essential only" in the customize modal so
 * a privacy-conscious user has less to click.
 */
export function isDoNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false;
  // @ts-expect-error — non-standard but widely supported
  const dnt = navigator.doNotTrack ?? navigator.msDoNotTrack ?? window.doNotTrack;
  return dnt === '1' || dnt === 'yes';
}
