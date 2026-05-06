// Combines next-intl routing + Supabase session refresh.
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './lib/i18n';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // /en is implicit; /de explicit
  // Read Accept-Language on first visit and route to the closest configured
  // locale — pt-BR / pt → fall back to defaultLocale (en); de-AT → /de, etc.
  // The choice is then persisted in the NEXT_LOCALE cookie for return visits.
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  // 1) Refresh Supabase session cookies
  const supaResponse = await updateSession(request);

  // 2) Run i18n routing — if it returns a redirect, honor it; otherwise return supaResponse
  const intlResponse = intlMiddleware(request);
  if (intlResponse && intlResponse.headers.get('x-middleware-rewrite')) {
    // i18n rewrote the URL — merge supabase cookies into it
    supaResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c.name, c.value));
    intlResponse.headers.forEach((value, key) => {
      if (!supaResponse.headers.has(key)) supaResponse.headers.set(key, value);
    });
  }
  return supaResponse;
}

export const config = {
  matcher: [
    // Run on all paths EXCEPT next internals, static files, `/api/*`, and `/auth/*`.
    // next-intl must NOT rewrite the upload route handlers (POST /api/upload/* would
    // become /en/api/upload/* and 404), nor the OAuth/magic-link callback at
    // /auth/callback (Supabase needs the exact path it was given), nor the
    // PWA contracts at the root (manifest.webmanifest, sw.js, robots.txt,
    // sitemap.xml) — those MUST live at exact root paths or browsers won't
    // accept the install prompt.
    '/((?!api/|auth/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|covers/|media/|ebook/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|m4a|wav|ogg|m3u8|ts|vtt|srt)$).*)',
  ],
};
