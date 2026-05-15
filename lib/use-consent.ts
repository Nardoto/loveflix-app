// React hook for cookie consent. Lives in its own client module so the rest
// of the consent API (parsing, cookie I/O) can be imported safely from both
// server and client components without tripping the "use client" boundary.

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CONSENT_EVENT,
  type Consent,
  type ConsentChoice,
  clearConsent,
  writeConsent,
} from './consent';

/**
 * Subscribe to consent changes. Returns current consent + setter that writes
 * the cookie, fires the global event, and triggers re-renders in any listener.
 *
 * Pass `initial` from the server (read via `getServerConsent()` in the layout)
 * so the first render matches what the SSR HTML expects — no hydration flash.
 */
export function useConsent(initial: Consent | null): {
  consent: Consent | null;
  setConsent: (choice: ConsentChoice) => Consent;
  clear: () => void;
} {
  const [consent, setLocalConsent] = useState<Consent | null>(initial);

  useEffect(() => {
    function onChange(e: Event) {
      const next = (e as CustomEvent<Consent | null>).detail ?? null;
      setLocalConsent(next);
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  const setConsent = useCallback((choice: ConsentChoice) => writeConsent(choice), []);
  const clear = useCallback(() => clearConsent(), []);

  return { consent, setConsent, clear };
}
