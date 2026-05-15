'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  type Consent,
  type ConsentChoice,
  isDoNotTrack,
} from '@/lib/consent';

export function CookieCustomizeModal({
  current,
  onClose,
  onSave,
}: {
  current: Consent | null;
  onClose: () => void;
  onSave: (choice: ConsentChoice) => void;
}) {
  const t = useTranslations('consent.modal');
  const firstToggleRef = useRef<HTMLInputElement>(null);

  // Pre-populate from current consent if any; otherwise pre-mark "essential
  // only" when the browser sends Do Not Track (privacy-conscious default,
  // but still requires the user to actually click Save — DNT is a hint,
  // not legal consent).
  const [analytics, setAnalytics] = useState<boolean>(
    current?.analytics ?? (isDoNotTrack() ? false : false),
  );
  const [session, setSession] = useState<boolean>(current?.session ?? false);

  // Focus first interactive toggle when modal opens; Esc closes without saving.
  useEffect(() => {
    firstToggleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Session replay only makes sense when analytics is also on (PostHog
  // can't record a session it can't identify). Cascade the dependency.
  function setAnalyticsCascaded(v: boolean) {
    setAnalytics(v);
    if (!v) setSession(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-card border border-white/[0.08] rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2
            id="consent-modal-title"
            className="font-serif italic font-black text-[24px] text-white leading-tight"
          >
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-mute hover:text-white p-1 -m-1"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-[13.5px] text-text-soft leading-relaxed mb-5">
          {t('intro')}
        </p>

        <ul className="flex flex-col gap-3 mb-6">
          <Toggle
            checked
            disabled
            label={t('essential.label')}
            desc={t('essential.desc')}
            sideLabel={t('essential.always')}
          />
          <Toggle
            ref={firstToggleRef}
            checked={analytics}
            onChange={setAnalyticsCascaded}
            label={t('analytics.label')}
            desc={t('analytics.desc')}
          />
          <Toggle
            checked={session}
            onChange={setSession}
            disabled={!analytics}
            label={t('session.label')}
            desc={t('session.desc')}
          />
        </ul>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-text-soft hover:text-white font-semibold text-[13.5px] px-4 py-2"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, session: session && analytics })}
            className="bg-rose hover:bg-rose-bright text-white font-semibold text-[13.5px] px-5 py-2 rounded-lg transition-colors"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

const Toggle = function Toggle({
  ref,
  checked,
  onChange,
  disabled,
  label,
  desc,
  sideLabel,
}: {
  ref?: React.Ref<HTMLInputElement>;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  desc: string;
  sideLabel?: string;
}) {
  return (
    <li
      className={[
        'bg-bg-elevated/40 border border-white/[0.05] rounded-xl p-4',
        disabled && !sideLabel ? 'opacity-50' : '',
      ].join(' ')}
    >
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className={[
            'mt-0.5 inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0',
            checked ? 'bg-rose' : 'bg-white/[0.1]',
            disabled ? 'cursor-not-allowed' : '',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
            ].join(' ')}
          />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[14px] text-white">{label}</span>
            {sideLabel && (
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-300">
                {sideLabel}
              </span>
            )}
          </span>
          <span className="block mt-1 text-[12.5px] text-text-dim leading-relaxed">
            {desc}
          </span>
        </span>
      </label>
    </li>
  );
};
