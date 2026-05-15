// Refreshes the user's session on every request.
// Called from `middleware.ts` at the project root.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export type SessionContext = {
  response: NextResponse;
  userId: string | null;
  ageVerified: boolean;
};

export async function updateSession(request: NextRequest): Promise<SessionContext> {
  let supabaseResponse = NextResponse.next({ request });

  // If envs are not set yet (Sprint 0 dev), skip session refresh.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { response: supabaseResponse, userId: null, ageVerified: false };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: don't run any code between createServerClient and getUser
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (!user) {
    return { response: supabaseResponse, userId: null, ageVerified: false };
  }

  // Lightweight check — only the columns the middleware needs to gate /watch
  // and /read. We don't want to fetch the full profile here.
  let ageVerified = false;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('age_verified_at, age_verified_expires_at')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.age_verified_at) {
      const exp = profile.age_verified_expires_at
        ? new Date(profile.age_verified_expires_at).getTime()
        : Number.POSITIVE_INFINITY;
      ageVerified = exp > Date.now();
    }
  } catch {
    // Column missing (migration not yet applied) — fail open in middleware,
    // RLS will still enforce on the data layer.
    ageVerified = false;
  }

  return { response: supabaseResponse, userId: user.id, ageVerified };
}
