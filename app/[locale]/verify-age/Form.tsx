'use client';

import { useState, useTransition } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { submitAgeVerification } from '@/app/actions/verify-age';

const MONTH_KEYS = [
  'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
] as const;

export function VerifyAgeForm({
  locale,
  returnTo,
  initialError,
}: {
  locale: string;
  returnTo: string;
  initialError?: string;
}) {
  const t = useTranslations('verifyAge');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError ? translateError(initialError, t) : null,
  );
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [accepted, setAccepted] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!year || !month || !day) {
      setError(t('errorRequired'));
      return;
    }
    if (!accepted) {
      setError(t('errorTerms'));
      return;
    }

    const fd = new FormData();
    fd.set('year', year);
    fd.set('month', month);
    fd.set('day', day);
    fd.set('terms_accepted', accepted ? 'on' : '');

    startTransition(async () => {
      const res = await submitAgeVerification(fd);
      if (!res.ok) {
        setError(translateError(res.error, t));
        return;
      }
      window.location.assign(returnTo);
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-bg-elevated rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40 space-y-5"
    >
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-text-mute mb-3">
          {t('dobLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label={t('monthLabel')}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={pending}
            className="h-12 bg-bg-deep rounded-xl px-3 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose/40"
          >
            <option value="">{t('monthLabel')}</option>
            {MONTH_KEYS.map((key, i) => (
              <option key={key} value={i + 1}>
                {t(`month_${key}`)}
              </option>
            ))}
          </select>
          <select
            aria-label={t('dayLabel')}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={pending}
            className="h-12 bg-bg-deep rounded-xl px-3 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose/40"
          >
            <option value="">{t('dayLabel')}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label={t('yearLabel')}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={pending}
            className="h-12 bg-bg-deep rounded-xl px-3 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose/40"
          >
            <option value="">{t('yearLabel')}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-sm text-text-dim leading-relaxed">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          disabled={pending}
          className="mt-1 size-4 rounded border-white/20 bg-bg-deep text-rose-bright focus:ring-rose/40 focus:ring-offset-0"
        />
        <span>
          {t.rich('termsLabel', {
            terms: (chunks) => (
              <a
                href={`/${locale}/terms`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-bright hover:underline"
              >
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a
                href={`/${locale}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-bright hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </span>
      </label>

      <Button
        type="submit"
        variant="rose"
        className="w-full h-12"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {t('submitting')}
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" /> {t('submit')}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-rose-bright text-center leading-relaxed">
          {error}
        </p>
      )}
    </form>
  );
}

function translateError(
  code: string,
  t: (key: string) => string,
): string {
  switch (code) {
    case 'AGE_BELOW_18':
      return t('errorUnder18');
    case 'INVALID_DOB':
      return t('errorInvalidDob');
    case 'TERMS_REQUIRED':
      return t('errorTerms');
    case 'NOT_AUTHENTICATED':
      return t('errorNotAuth');
    default:
      return t('errorUnknown');
  }
}
