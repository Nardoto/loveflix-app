import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import Image from 'next/image';
import { Heart, Globe, BellRing, LogOut, ArrowRight, Crown } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth-helpers';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { AccountSubscription } from '@/components/account/AccountSubscription';
import { getFavoritesForUser } from '@/lib/data/favorites-server';
import { pickCurrency, PRICE_DISPLAY } from '@/lib/stripe';

// Supabase Google OAuth populates user.user_metadata with these fields:
//   - full_name | name
//   - avatar_url | picture
//   - email | preferred_username
// Magic-link sign-in only fills `email` (no avatar/name yet) — that's why we
// fall back to the email's local-part for display name and a heart glyph
// for the avatar tile.

function pickDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const md = user.user_metadata ?? {};
  const fullName = (md.full_name || md.name) as string | undefined;
  if (fullName) return fullName;
  if (user.email) return user.email.split('@')[0];
  return 'You';
}

function pickAvatar(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const md = user.user_metadata ?? {};
  return (md.avatar_url || md.picture) as string | null ?? null;
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ upgrade?: string; from?: string }>;
}) {
  const { locale } = await params;
  const { upgrade, from } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  const tPaywall = await getTranslations('paywall');

  // Paywall return-to flow:
  // 1) Premium gate redireciona pra /account?upgrade=required&from=/s/<slug>
  //    → gravamos `from` em cookie de 1h (Stripe Checkout pode demorar).
  // 2) Stripe success_url volta pra /account?upgrade=success
  //    → lemos o cookie, validamos que é path interno (anti open-redirect),
  //    apagamos o cookie e redirecionamos a usuária direto pra story.
  const cookieStore = await cookies();
  const upgradeRequired = upgrade === 'required';
  if (upgradeRequired && from && from.startsWith('/')) {
    cookieStore.set('paywall-from', from, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });
  }
  if (upgrade === 'success') {
    const saved = cookieStore.get('paywall-from')?.value;
    if (saved && saved.startsWith('/')) {
      cookieStore.set('paywall-from', '', { maxAge: 0, path: '/' });
      redirect(saved);
    }
  }

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/account`)}`);
  }

  const displayName = pickDisplayName(user);
  const avatarUrl = pickAvatar(user);
  const email = user.email ?? '';

  // Pull live subscription state from Supabase (RLS limits to own row).
  // If the table doesn't exist yet (migration 0004 not run), or there's no
  // row for this user, we render the "Free" state.
  let subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    subscription = data ?? null;
  } catch {
    subscription = null;
  }

  const hasStripe = !!process.env.STRIPE_SECRET_KEY;

  // Preview da Minha Lista — primeiras 6 stories. Lazy enough; getFavorites
  // resolve em uma query.
  const favPreview = (await getFavoritesForUser(user.id)).slice(0, 6);

  // Pick the price in the user's currency for the Upgrade button label.
  const h = await headers();
  const country =
    h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || null;
  const currency = pickCurrency({ country, locale });
  const priceLabel = PRICE_DISPLAY[currency].label;

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-4xl mx-auto pb-20">
      <header className="flex items-center gap-4 mb-10">
        {avatarUrl ? (
          <span className="relative size-16 md:size-20 rounded-full overflow-hidden bg-bg-deep ring-2 ring-rose-bright/30 shrink-0 shadow-xl shadow-rose/30">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
              priority
            />
          </span>
        ) : (
          <div className="size-16 md:size-20 rounded-full bg-gradient-to-br from-rose to-rose-deep flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-rose/30 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-text-mute">
            {t('welcomeBack')}
          </p>
          <h1 className="font-serif italic text-2xl sm:text-3xl md:text-4xl font-bold text-white truncate">
            {displayName}
          </h1>
          <p className="text-text-dim text-sm mt-1 truncate">{email}</p>
        </div>
      </header>

      {upgradeRequired && (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-rose/10 p-5 shadow-lg shadow-gold/10">
          <div className="flex items-start gap-3">
            <span className="size-9 shrink-0 rounded-full bg-gradient-to-br from-gold-bright to-gold grid place-items-center text-bg-deep">
              <Crown className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif italic font-bold text-lg text-white mb-1">
                {tPaywall('requiredTitle')}
              </h2>
              <p className="text-sm text-text-soft leading-relaxed">
                {tPaywall('upgradeBanner')}
              </p>
            </div>
          </div>
        </div>
      )}

      <AccountSubscription
        subscription={subscription}
        hasStripe={hasStripe}
        priceLabel={priceLabel}
        currencySymbol={PRICE_DISPLAY[currency].symbol}
        currencyAmount={PRICE_DISPLAY[currency].amount}
      />

      <section className="mb-10">
        <h2 className="font-serif italic text-2xl font-bold text-white mb-4">
          {t('preferences')}
        </h2>
        <div className="bg-bg-elevated rounded-2xl shadow-lg shadow-black/30 [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:left-5 [&>*+*]:before:right-5 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-white/5">
          <PreferenceRow icon={<Globe />} label={t('language')} value={locale.toUpperCase()} />
          <PreferenceRow icon={<BellRing />} label={t('notifications')} value={t('allowed')} />
          <PreferenceRow icon={<Heart />} label={t('matureContent')} value={t('on')} />
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif italic text-2xl font-bold text-white">
            {t('myList')}
          </h2>
          {favPreview.length > 0 && (
            <Link
              href={'/list' as never}
              className="text-[13px] font-bold uppercase tracking-wider text-rose-bright hover:text-rose inline-flex items-center gap-1"
            >
              {t('seeAll')} <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        {favPreview.length === 0 ? (
          <div className="bg-bg-elevated rounded-2xl p-6 text-center text-text-dim shadow-lg shadow-black/30">
            <p>{t('emptyMyListTip')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {favPreview.map((s) => (
              <Link
                key={s.id}
                href={`/s/${s.slug}` as never}
                className="group relative aspect-video rounded-lg overflow-hidden bg-bg-card ring-1 ring-white/10 hover:ring-white/30 transition-all"
              >
                <Image
                  src={s.cover}
                  alt={s.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover object-[center_28%] group-hover:scale-[1.04] transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5">
                  <p className="text-[12px] font-serif italic font-semibold text-white line-clamp-2 leading-tight">
                    {s.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="text-rose hover:text-rose-bright"
        >
          <LogOut /> {t('signOut')}
        </Button>
      </form>
    </div>
  );
}

function PreferenceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="text-rose-bright [&_svg]:size-5">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-text-dim">{value}</span>
    </div>
  );
}
