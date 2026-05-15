// OAuth + magic-link callback. Supabase redirects here after the user finishes
// signing in (Google consent screen, or clicking the link in their email).
// We exchange the `code` query param for a session cookie and then bounce the
// user to the page they originally tried to reach (`returnTo`).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const returnTo = url.searchParams.get('returnTo') || '/';

  // OAuth provider may return an error (user cancelled Google consent etc).
  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || errorParam)}`,
        url.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+auth+code', url.origin),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          url.origin,
        ),
      );
    }

    // Whitelist: only redirect to same-origin paths.
    const target = returnTo.startsWith('/') ? returnTo : '/';

    // Age gate: if the freshly authenticated user has not yet verified age,
    // route them through /verify-age and preserve their original destination.
    // We pick the locale prefix from `target` so the verify-age page lands
    // in the same language they started in.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('age_verified_at, age_verified_expires_at')
        .eq('id', userId)
        .maybeSingle();
      const verified =
        profile?.age_verified_at &&
        (!profile.age_verified_expires_at ||
          new Date(profile.age_verified_expires_at).getTime() > Date.now());
      if (!verified) {
        const localeMatch = target.match(/^\/(en|de|fr|es)(?:\/|$)/);
        const locale = localeMatch?.[1] ?? 'en';
        const verifyUrl = new URL(`/${locale}/verify-age`, url.origin);
        verifyUrl.searchParams.set('returnTo', target);
        return NextResponse.redirect(verifyUrl);
      }
    }

    return NextResponse.redirect(new URL(target, url.origin));
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          e instanceof Error ? e.message : 'Sign-in failed',
        )}`,
        url.origin,
      ),
    );
  }
}
