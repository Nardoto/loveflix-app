// Server-only consent reader. Splits from lib/consent.ts because next/headers
// can't be imported into client bundles.

import 'server-only';
import { cookies } from 'next/headers';
import { CONSENT_COOKIE, parseConsent, type Consent } from './consent';

export async function getServerConsent(): Promise<Consent | null> {
  const store = await cookies();
  return parseConsent(store.get(CONSENT_COOKIE)?.value);
}
