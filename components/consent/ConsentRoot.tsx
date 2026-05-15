// Mount point for the cookie banner + customize modal. Server component
// reads the consent cookie once per request — if the visitor already chose,
// no banner markup ships at all (avoids hydration flash). The modal is
// always mounted so the footer link can open it later via global event.

import { getServerConsent } from '@/lib/consent-server';
import { ConsentRootClient } from './ConsentRootClient';

export async function ConsentRoot() {
  const consent = await getServerConsent();
  return <ConsentRootClient initialConsent={consent} />;
}
