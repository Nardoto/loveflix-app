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

  // Whitelist: only redirect to same-origin paths.
  const target = returnTo.startsWith('/') ? returnTo : '/';
  return NextResponse.redirect(new URL(target, url.origin));
}
