'use client';

import { useTransition, useState } from 'react';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isActive =
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing');
  const renewsOn = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
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
              ? 'Trial'
              : 'Active'
            : 'Free'}
        </Badge>
        <h3 className="font-serif italic text-2xl font-bold text-white mb-1">
          {isActive ? 'Monthly Plan' : 'Free account'}
        </h3>
        <p className="text-text-dim text-sm mb-4">
          {isActive && renewsOn ? (
            subscription?.cancel_at_period_end ? (
              <>
                Ends on <span className="text-text-soft">{renewsOn}</span>
              </>
            ) : (
              <>
                Renews on <span className="text-text-soft">{renewsOn}</span>
              </>
            )
          ) : (
            <>Upgrade for full access to premium stories.</>
          )}
        </p>
        {isActive ? (
          <p className="text-3xl font-bold text-rose-bright">
            {currencySymbol}
            {currencyAmount}
            <span className="text-sm text-text-dim font-normal ml-1">
              /month
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
                <Loader2 className="size-4 animate-spin" /> Loading…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Upgrade — {priceLabel}
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
          Manage subscription
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
                  <Loader2 className="size-4 animate-spin" /> Loading portal…
                </>
              ) : (
                <>
                  <CreditCard className="size-4" /> Manage in Stripe portal
                </>
              )}
            </Button>
            <p className="text-[11px] text-text-mute mt-3">
              You&apos;ll be redirected to Stripe to update your card,
              download invoices, or cancel.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-dim">
            {hasStripe
              ? 'Manage your subscription here once you upgrade.'
              : 'Stripe is not configured yet. Connect Stripe in admin settings.'}
          </p>
        )}
        {error && (
          <p className="text-xs text-rose-bright mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
