// Authorization helpers for Server Components / Route Handlers / Server Actions.

import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** True when Supabase env vars are not set — falls back to "open studio". */
const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Returns the logged-in user, or null. Never throws when Supabase is not configured. */
export async function getUser() {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Studio access gate. MVP behavior:
 * - When Supabase IS configured: require a logged-in user whose email is in ADMIN_EMAILS.
 * - When Supabase is NOT configured: open access + warning flag (so the page can render
 *   a banner telling the operator to wire up auth before going live).
 *
 * Returning `setup` instead of failing avoids 500s on a fresh deployment where the
 * operator hasn't filled SUPABASE_URL yet — they can still reach the Studio and upload.
 */
export async function requireAdmin() {
  if (!SUPABASE_CONFIGURED) {
    return { ok: true as const, user: null, setup: 'open' as const };
  }
  const user = await getUser();
  if (!user) return { ok: false as const, status: 401, message: 'Not authenticated' };
  const email = user.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }
  return { ok: true as const, user, setup: 'configured' as const };
}
