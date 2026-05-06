import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { locales, type Locale } from '@/lib/i18n';
import { PostHogProvider } from '@/lib/posthog';
import { TopBar } from '@/components/layout/TopBar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { SearchProvider } from '@/components/layout/SearchProvider';
import { PWASupport } from '@/components/layout/PWASupport';
import { InstallProvider } from '@/components/layout/InstallProvider';
import { getUser } from '@/lib/auth-helpers';

// Public-site layout. Nests inside the root <html>/<body> from app/layout.tsx
// — DO NOT render those again here. NextIntl provider, top/bottom bars,
// footer and PWA bits live here only.

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  // Resolve current user once per request and pass down — avoids hitting
  // Supabase from inside the client TopBar component.
  const user = await getUser();
  const userMeta = user
    ? {
        email: user.email ?? null,
        displayName:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          (user.email ? user.email.split('@')[0] : 'You'),
        avatarUrl:
          (user.user_metadata?.avatar_url as string | undefined) ||
          (user.user_metadata?.picture as string | undefined) ||
          null,
      }
    : null;

  return (
    <NextIntlClientProvider messages={messages}>
      <PostHogProvider>
        <SearchProvider>
          <InstallProvider>
            <TopBar user={userMeta} />
            {/* pb-20 reserves room for the bottom tab bar on mobile so
                the last row isn't hidden behind it. */}
            <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
            <footer className="mt-24 py-12 px-4 md:px-10 text-center text-xs text-text-mute pb-24 lg:pb-12">
              <div className="inline-flex flex-col items-center mb-4">
                <span className="font-serif text-2xl md:text-3xl font-black italic tracking-tight leading-none">
                  <span className="brand-allure">Allure</span>
                  <span className="brand-tv">TV</span>
                </span>
                <span className="brand-rule mt-1 w-32" />
              </div>
              <p className="text-text-dim">
                Romance stories you can listen, watch and read.
              </p>
              <p className="mt-2 text-gold-deep tracking-widest uppercase text-[10px] font-bold">
                alluretv.net
              </p>
              <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-text-dim">
                <a
                  href={`/${locale}/privacy`}
                  className="hover:text-rose-bright transition-colors"
                >
                  Privacy
                </a>
                <span className="text-text-mute/40">·</span>
                <a
                  href={`/${locale}/terms`}
                  className="hover:text-rose-bright transition-colors"
                >
                  Terms
                </a>
                <span className="text-text-mute/40">·</span>
                <a
                  href="mailto:rededecanaisanonimo@gmail.com"
                  className="hover:text-rose-bright transition-colors"
                >
                  Contact
                </a>
              </nav>
              <p className="mt-4 opacity-60">
                © 2026 AllureTV — All rights reserved.
              </p>
            </footer>
            <BottomTabBar />
            <PWASupport />
          </InstallProvider>
        </SearchProvider>
      </PostHogProvider>
    </NextIntlClientProvider>
  );
}
