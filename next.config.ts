import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');

const nextConfig: NextConfig = {
  // R2 (via Worker) + Supabase Storage + randomuser.me (review avatars)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.alluretv.net' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
};

export default withNextIntl(nextConfig);
