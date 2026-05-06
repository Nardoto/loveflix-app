import { permanentRedirect } from 'next/navigation';

// /studio was the legacy public-facing operator dashboard. It now lives at
// /admin (gated by ADMIN_EMAILS) — this redirect keeps any old bookmarks
// working while removing the route from the public navigation.
export default function StudioRedirectPage() {
  permanentRedirect('/admin');
}
