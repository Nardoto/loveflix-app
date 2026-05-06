import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');

const nextConfig: NextConfig = {
  // R2 (via Worker) + Supabase Storage + randomuser.me (review avatars) +
  // Google profile pictures (lh3.googleusercontent.com / lh4-6 variants)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.alluretv.net' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
