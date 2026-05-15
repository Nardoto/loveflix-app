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

// Paths that require age verification (post-login gate). Matches `/watch`
// and `/read` under a story slug, and the corresponding /account/watch and
// /account/read entry-points. Locale prefix is optional (default locale is
// implicit at the root). Catalog cards under /s/<slug> stay open for SEO.
const AGE_GATED_PATH = /^\/(?:(?:en|de|fr|es)\/)?(?:s\/[^/]+\/(?:watch|read)|account\/(?:watch|read))$/;

function localeFromPath(path: string): string {
  const m = path.match(/^\/(en|de|fr|es)(?:\/|$)/);
  return m?.[1] ?? 'en';
}

export async function middleware(request: NextRequest) {
  // 1) Refresh Supabase session cookies + read age-verified flag
  const { response: supaResponse, userId, ageVerified } = await updateSession(request);

  // 2) Age gate: logged-in user trying to /watch or /read without age_verified
  // → bounce to /verify-age preserving returnTo. Anonymous users hit the
  // paywall/login flow first (handled below by the existing redirect chain).
  const path = request.nextUrl.pathname;
  if (userId && !ageVerified && AGE_GATED_PATH.test(path)) {
    const locale = localeFromPath(path);
    const verifyUrl = new URL(`/${locale}/verify-age`, request.url);
    verifyUrl.searchParams.set('returnTo', path + (request.nextUrl.search || ''));
    return NextResponse.redirect(verifyUrl);
  }

  // 3) Run i18n routing — if it returns a redirect, honor it; otherwise return supaResponse
  const intlResponse = intlMiddleware(request);
  if (intlResponse && intlResponse.headers.get('x-middleware-rewrite')) {
    // i18n rewrote the URL — merge supabase cookies into it
    supaResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c.name, c.value));
    intlResponse.headers.forEach((value, key) => {
      if (!supaResponse.headers.has(key)) supaResponse.headers.set(key, value);
    });
  }

  // 4) Paywall return-to cookie. /watch e /read redirecionam pra
  // /account?upgrade=required&from=/<locale>/s/<slug>. Em Next 16 não dá
  // pra chamar cookies().set() dentro de uma Server Component (a page
  // batia 500), então o cookie é escrito aqui na middleware. O page só
  // lê o cookie quando upgrade=success pra mandar a usuária de volta.
  const isAccount = path === '/account' || /^\/(en|de|fr|es)\/account$/.test(path);
  if (isAccount) {
    const upgrade = request.nextUrl.searchParams.get('upgrade');
    const from = request.nextUrl.searchParams.get('from');
    if (upgrade === 'required' && from && from.startsWith('/')) {
      supaResponse.cookies.set('paywall-from', from, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60,
        path: '/',
      });
    }
  }

  return supaResponse;
}

export const config = {
  matcher: [
    // Run on all paths EXCEPT next internals, static files, `/api/*`, `/auth/*`,
    // and `/admin/*`. next-intl must NOT rewrite the upload route handlers
    // (POST /api/upload/* would become /en/api/upload/* and 404), nor the
    // OAuth/magic-link callback at /auth/callback (Supabase needs the exact
    // path it was given), nor the admin area which lives outside the locale
    // tree (admin is English-only and branded separately), nor the PWA
    // contracts at the root (manifest.webmanifest, sw.js, robots.txt,
    // sitemap.xml) — those MUST live at exact root paths or browsers won't
    // accept the install prompt.
    '/((?!api/|auth/|admin(?:/|$)|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|covers/|media/|ebook/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|m4a|wav|ogg|m3u8|ts|vtt|srt)$).*)',
  ],
};
