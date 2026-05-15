'use client';

import { useEffect, useState } from 'react';
import { type Consent, OPEN_PREFERENCES_EVENT } from '@/lib/consent';
import { useConsent } from '@/lib/use-consent';
import { CookieBanner } from './CookieBanner';
import { CookieCustomizeModal } from './CookieCustomizeModal';

export function ConsentRootClient({
  initialConsent,
}: {
  initialConsent: Consent | null;
}) {
  const { consent, setConsent } = useConsent(initialConsent);
  const [modalOpen, setModalOpen] = useState(false);

  // Footer link / "Customize" inside the banner / any other trigger fires
  // OPEN_PREFERENCES_EVENT — listen globally so we don't need prop drilling.
  useEffect(() => {
    function onOpen() {
      setModalOpen(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpen);
  }, []);

  return (
    <>
      {consent === null && (
        <CookieBanner
          onAcceptAll={() => setConsent({ analytics: true, session: true })}
          onEssentialOnly={() => setConsent({ analytics: false, session: false })}
          onCustomize={() => setModalOpen(true)}
        />
      )}
      {modalOpen && (
        <CookieCustomizeModal
          current={consent}
          onClose={() => setModalOpen(false)}
          onSave={(choice) => {
            setConsent(choice);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
