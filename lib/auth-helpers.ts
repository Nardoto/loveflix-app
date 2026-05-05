// Authorization helpers for Server Components / Route Handlers / Server Actions.

import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Returns the logged-in user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Checks studio/admin access. MVP: env-var allowlist of emails. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) return { ok: false as const, status: 401, message: 'Not authenticated' };
  const email = user.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }
  return { ok: true as const, user };
}
