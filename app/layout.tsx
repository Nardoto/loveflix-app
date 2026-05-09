// Single root layout for the whole app — owns <html>/<body> + global fonts.
// Both /[locale]/* (public site) and /admin/* (operator UI) nest into this
// layout. The locale layout adds NextIntl + TopBar/footer; the admin layout
// adds the sidebar gate. Neither renders its own <html>/<body>.
import './globals.css';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono, Lora } from 'next/font/google';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// Reader body for long-form ebook reading.
const fontReader = Lora({
  variable: '--font-reader',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'AllureTV',
  description: 'Romance stories you can listen, watch and read.',
  applicationName: 'AllureTV',
  appleWebApp: {
    capable: true,
    title: 'AllureTV',
    statusBarStyle: 'black-translucent' as const,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon.jpg',
    apple: '/icon.jpg',
  },
};

export const viewport = {
  themeColor: '#0a0710',
  width: 'device-width',
  initialScale: 1,
  // Allow up to 5x zoom — accessibility for 55+ users who pinch-zoom.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fontReader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-deep text-text-soft">{children}</body>
    </html>
  );
}
