// Pure paywall helpers — no server-only dependencies. Safe to import from
// Client Components. The async tier-lookup helpers live in `auth-helpers.ts`
// (server-only because they touch cookies + Supabase).

export type SubscriptionTier = 'active' | 'trialing' | 'free';

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
