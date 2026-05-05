// Minimal root layout — i18n locale layout lives at /app/[locale]/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';

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
  return children;
}
