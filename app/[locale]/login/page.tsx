import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { getUser } from '@/lib/auth-helpers';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { returnTo, error } = await searchParams;
  setRequestLocale(locale);

  // If already signed in, just bounce them where they wanted to go.
  const user = await getUser();
  if (user) {
    redirect(returnTo && returnTo.startsWith('/') ? returnTo : `/${locale}`);
  }

  return (
    <div className="min-h-[100svh] grid place-items-center px-5 py-16 relative overflow-hidden">
      {/* Soft brand backdrop */}
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
            Welcome
          </h1>
          <p className="text-text-dim text-sm">
            Sign in to continue listening, reading, and reviewing.
          </p>
        </div>

        <LoginForm
          returnTo={returnTo && returnTo.startsWith('/') ? returnTo : `/${locale}`}
          initialError={error}
        />

        <p className="text-xs text-text-mute text-center mt-6 leading-relaxed">
          By continuing you agree to AllureTV&apos;s terms.
          <br />
          We&apos;ll only email you about your account — never spam.
        </p>
      </div>
    </div>
  );
}
