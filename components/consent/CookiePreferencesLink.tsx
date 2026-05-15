'use client';

import { useTranslations } from 'next-intl';
import { openPreferences } from '@/lib/consent';

export function CookiePreferencesLink({ className }: { className?: string }) {
  const t = useTranslations('consent.footer');
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={className ?? 'hover:text-rose-bright transition-colors'}
    >
      {t('preferences')}
    </button>
  );
}
