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

/** True if the email is in ADMIN_EMAILS. Case-insensitive. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
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
  if (!isAdminEmail(user.email)) {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }
  return { ok: true as const, user, setup: 'configured' as const };
}

// =====================================================================
// Subscription tier — used by the paywall (premium stories gate watch /
// listen / read for non-subscribers).
// =====================================================================

export type SubscriptionTier = 'active' | 'trialing' | 'free';

/**
 * Resolve the current user's subscription tier. Returns null for anonymous.
 * Admin emails always return 'active' so the operator can QA premium content
 * without seeding a Stripe row.
 */
export async function getSubscriptionTier(): Promise<SubscriptionTier | null> {
  const user = await getUser();
  if (!user) return null;
  if (isAdminEmail(user.email)) return 'active';

  if (!SUPABASE_CONFIGURED) return 'free';
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.status === 'active' || data?.status === 'trialing') {
      return data.status;
    }
  } catch {
    /* table missing or RLS issue — fall through to free */
  }
  return 'free';
}

/** Convenience: true for active/trialing/admin; false for free or anonymous. */
export async function isSubscriber(): Promise<boolean> {
  const tier = await getSubscriptionTier();
  return tier === 'active' || tier === 'trialing';
}

/** Pure helper for client components that already received a tier prop. */
export function tierIsSubscriber(tier?: SubscriptionTier | null): boolean {
  return tier === 'active' || tier === 'trialing';
}

/**
 * Paywall policy:
 *   Catálogo (capas, títulos, sinopses) é público — qualquer pessoa abre.
 *   Conteúdo (vídeo, áudio, ebook) por padrão exige assinatura ativa OU
 *   admin email. Duas exceções:
 *     - is_coming_soon: o CTA já é "Coming Soon"; sem media.
 *     - is_free: o admin marcou essa story como amostra grátis (teaser
 *       de marketing); abre pra qualquer um, inclusive anônimo. O token
 *       de mídia ganha um keyPrefix scoped pra essa story só, evitando
 *       que vaze o token e funcione em conteúdo pago.
 */
export function storyRequiresUpgrade(
  story: { isComingSoon?: boolean; isFree?: boolean },
  userTier: SubscriptionTier | null | undefined,
): boolean {
  if (story.isComingSoon) return false;
  if (story.isFree) return false;
  return !tierIsSubscriber(userTier);
}
