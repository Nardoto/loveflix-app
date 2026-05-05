// Minimal service worker — required by Chrome's PWA installability check.
// Without a fetch handler, Chrome offers only "Add to home screen" (a Chrome
// bookmark inside the browser shell) instead of "Install app" (standalone
// fullscreen). The fetch handler does not need to do anything; its presence
// is what flips the bit.
//
// We don't cache anything yet — Vercel handles caching at the edge, and a
// stale-while-revalidate strategy can be layered on later if we want offline.

self.addEventListener('install', (event) => {
  // Activate this version immediately on first install.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients without forcing a reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass-through. The empty handler is enough for installability.
});
