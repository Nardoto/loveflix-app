'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function CookieBanner({
  onAcceptAll,
  onEssentialOnly,
  onCustomize,
}: {
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
  onCustomize: () => void;
}) {
  const t = useTranslations('consent.banner');
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  // Fade in after mount so the banner doesn't snap into view during hydration.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape = "essential only" — the conservative default.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onEssentialOnly();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEssentialOnly]);

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-body"
      aria-modal="false"
      className={[
        'fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md mb-20 lg:mb-4',
        'z-[60] bg-bg-card border border-rose/20 rounded-2xl p-5 shadow-2xl',
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      ].join(' ')}
    >
      <h2
        id="consent-banner-title"
        className="font-serif italic font-bold text-[17px] text-rose-bright mb-1.5"
      >
        {t('title')}
      </h2>
      <p
        id="consent-banner-body"
        className="text-[13px] leading-relaxed text-text-soft mb-4"
      >
        {t('body')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAcceptAll}
          className="bg-rose hover:bg-rose-bright text-white font-semibold text-[13px] px-4 py-2 rounded-lg transition-colors"
        >
          {t('acceptAll')}
        </button>
        <button
          type="button"
          onClick={onEssentialOnly}
          className="border border-white/15 text-text-soft hover:text-white hover:border-white/30 font-semibold text-[13px] px-4 py-2 rounded-lg transition-colors"
        >
          {t('essentialOnly')}
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="text-gold-deep hover:text-gold-bright font-semibold text-[13px] underline underline-offset-4 px-2"
        >
          {t('customize')}
        </button>
      </div>
      <Link
        href={`/${locale}/cookies`}
        className="block mt-3 text-[11.5px] text-text-mute hover:text-text-soft underline underline-offset-2"
      >
        {t('learnMore')} →
      </Link>
    </div>
  );
}
