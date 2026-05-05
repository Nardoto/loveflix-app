import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import {
  Geist,
  Geist_Mono,
  Sacramento,
  Great_Vibes,
  Yellowtail,
  Pinyon_Script,
  Lora,
} from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { locales, type Locale } from '@/lib/i18n';
import { PostHogProvider } from '@/lib/posthog';
import { TopBar } from '@/components/layout/TopBar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { SearchProvider } from '@/components/layout/SearchProvider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// One distinct script font per creator — gives each channel its own signature.
const fontLena = Sacramento({
  variable: '--font-lena',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});
const fontDavid = Great_Vibes({
  variable: '--font-david',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});
const fontAdam = Yellowtail({
  variable: '--font-adam',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});
const fontMarcus = Pinyon_Script({
  variable: '--font-marcus',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

// Reader body — chosen for long-form romance reading on mobile (Lora is
// optimized for screen reading, has a calligraphic italic that pairs with
// the rose+gold AllureTV palette).
const fontReader = Lora({
  variable: '--font-reader',
  subsets: ['latin'],
  display: 'swap',
});

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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${fontLena.variable} ${fontDavid.variable} ${fontAdam.variable} ${fontMarcus.variable} ${fontReader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-deep text-text-soft">
        <NextIntlClientProvider messages={messages}>
          <PostHogProvider>
            <SearchProvider>
              <TopBar />
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
                <p className="mt-4 opacity-60">
                  © 2026 AllureTV — All rights reserved.
                </p>
              </footer>
              <BottomTabBar />
            </SearchProvider>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
