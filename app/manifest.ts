import type { MetadataRoute } from 'next';

// PWA manifest — installable as a standalone app on iOS/Android home
// screens. `display: standalone` strips the browser chrome, so when a
// user taps the icon the app opens fullscreen (no URL bar).
//
// The icons reference logo/mark.jpg which is a 1024×1024 image with the
// circular A monogram centered — that gives enough safe zone for the
// "maskable" purpose (Android adaptive icon shapes).

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AllureTV — Romance Audiobooks',
    short_name: 'AllureTV',
    description:
      'Sensual romance audiobooks and ebooks. Listen, read, and watch.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0710',
    theme_color: '#0a0710',
    lang: 'en',
    categories: ['entertainment', 'books', 'lifestyle'],
    icons: [
      {
        src: '/logo/mark.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/logo/mark.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/logo/mark.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: '/logo/mark.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
