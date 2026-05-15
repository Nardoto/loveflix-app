import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth-helpers';
import { VerifyAgeForm } from './Form';

export default async function VerifyAgePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { returnTo, error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('verifyAge');

  const user = await getUser();
  if (!user) {
    const next = `/${locale}/verify-age${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(next)}`);
  }

  // Already verified? Skip the gate.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('age_verified_at, age_verified_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const stillValid =
    profile?.age_verified_at &&
    (!profile.age_verified_expires_at ||
      new Date(profile.age_verified_expires_at).getTime() > Date.now());

  if (stillValid) {
    redirect(returnTo && returnTo.startsWith('/') ? returnTo : `/${locale}`);
  }

  return (
    <div className="min-h-[100svh] grid place-items-center px-5 py-16 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a0610] via-[#0a0408] to-[#0a0408]"
      />
      <div
        aria-hidden
        className="absolute -top-40 -left-40 size-[600px] rounded-full bg-rose/10 blur-3xl -z-10"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-40 size-[600px] rounded-full bg-gold/5 blur-3xl -z-10"
      />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo/wordmark.jpg"
            alt="AllureTV"
            width={180}
            height={48}
            className="h-10 md:h-12 w-auto mx-auto mb-6 rounded"
            unoptimized
            priority
          />
          <h1 className="font-serif italic text-3xl md:text-4xl font-bold text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-text-dim text-sm leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <VerifyAgeForm
          locale={locale}
          returnTo={returnTo && returnTo.startsWith('/') ? returnTo : `/${locale}`}
          initialError={error}
        />

        <p className="text-xs text-text-mute text-center mt-6 leading-relaxed">
          {t('disclaimer')}
        </p>
      </div>
    </div>
  );
}
