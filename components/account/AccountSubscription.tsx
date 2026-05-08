'use client';

import { useTransition, useState } from 'react';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  createCheckoutSession,
  createPortalSession,
} from '@/app/actions/stripe';

type Subscription = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null;

export function AccountSubscription({
  subscription,
  hasStripe,
  priceLabel = '$14.99/mo',
  currencySymbol = '$',
  currencyAmount = '14.99',
}: {
  subscription: Subscription;
  hasStripe: boolean;
  priceLabel?: string;
  currencySymbol?: string;
  currencyAmount?: string;
}) {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isActive =
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing');
  const renewsOn = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const onUpgrade = () => {
    setError(null);
    start(async () => {
      const res = await createCheckoutSession();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.data.url;
    });
  };

  const onManage = () => {
    setError(null);
    start(async () => {
      const res = await createPortalSession();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.data.url;
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-10">
      <div className="bg-bg-elevated rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-rose/15">
        <Badge variant={isActive ? 'hot' : 'genre'} className="mb-3">
          {isActive
            ? subscription?.status === 'trialing'
              ? t('trial')
              : t('active')
            : t('free')}
        </Badge>
        <h3 className="font-serif italic text-2xl font-bold text-white mb-1">
          {isActive ? t('monthlyPlan') : t('freeAccount')}
        </h3>
        <p className="text-text-dim text-sm mb-4">
          {isActive && renewsOn ? (
            subscription?.cancel_at_period_end ? (
              <>
                {t('endsOn')} <span className="text-text-soft">{renewsOn}</span>
              </>
            ) : (
              <>
                {t('renewsOn')} <span className="text-text-soft">{renewsOn}</span>
              </>
            )
          ) : (
            <>{t('upgradeMessage')}</>
          )}
        </p>
        {isActive ? (
          <p className="text-3xl font-bold text-rose-bright">
            {currencySymbol}
            {currencyAmount}
            <span className="text-sm text-text-dim font-normal ml-1">
              {t('perMonth')}
            </span>
          </p>
        ) : (
          <Button
            variant="rose"
            onClick={onUpgrade}
            disabled={pending || !hasStripe}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t('loading')}
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> {t('upgrade', { priceLabel })}
              </>
            )}
          </Button>
        )}
        <div className="absolute -right-4 -bottom-4 text-rose/10 text-9xl pointer-events-none select-none">
          ♥
        </div>
      </div>

      <div className="bg-bg-elevated rounded-2xl p-6 space-y-3 shadow-lg shadow-black/30">
        <h3 className="font-serif italic text-xl font-bold text-white">
          {t('manageTitle')}
        </h3>
        {isActive ? (
          <>
            <Button
              variant="glass"
              className="w-full justify-start"
              onClick={onManage}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t('loadingPortal')}
                </>
              ) : (
                <>
                  <CreditCard className="size-4" /> {t('manageInPortal')}
                </>
              )}
            </Button>
            <p className="text-[11px] text-text-mute mt-3">
              {t('stripeRedirectMessage')}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-dim">
            {hasStripe
              ? t('manageWhenUpgraded')
              : t('stripeNotConfigured')}
          </p>
        )}
        {error && (
          <p className="text-xs text-rose-bright mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
