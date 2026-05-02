// Minimal root layout — i18n locale layout lives at /app/[locale]/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'LOVEFLIX',
  description: 'Romance stories you can listen, watch and read.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
