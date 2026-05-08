// Server-side helpers pra ler favoritos. NÃO cacheia com unstable_cache
// porque o resultado é per-user — usaria mais memória do que economizaria.
// As páginas que chamam essas funções já são force-dynamic.

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import type { Story } from './stories';
import { getAllStories } from './stories-server';

/** Retorna os slugs favoritados pelo usuário. Set pra lookup O(1) na UI. */
export async function getFavoriteSlugs(userId: string): Promise<Set<string>> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('favorites')
    .select('story_id, stories!inner(slug)')
    .eq('user_id', userId);
  const slugs = new Set<string>();
  for (const row of (data ?? []) as Array<{ stories: { slug: string } | { slug: string }[] }>) {
    // PostgREST !inner pode vir como array ou objeto; normaliza.
    const s = Array.isArray(row.stories) ? row.stories[0] : row.stories;
    if (s?.slug) slugs.add(s.slug);
  }
  return slugs;
}

/** Stories favoritadas, ordenadas pelo último adicionado primeiro. */
export async function getFavoritesForUser(userId: string): Promise<Story[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('favorites')
    .select('story_id, added_at')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  const ids = (data ?? []).map((r) => r.story_id as string);
  if (ids.length === 0) return [];

  // Reusa o catálogo já cacheado (com fallback hardcoded). Filtrar em
  // memória é mais barato que duplicar a query do Supabase aqui.
  const all = await getAllStories();
  const byId = new Map(all.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter((s): s is Story => !!s);
}

/** Conveniência: 1 chamada decide se o botão deve mostrar "+" ou "✓". */
export async function isFavorite(userId: string, storySlug: string): Promise<boolean> {
  const slugs = await getFavoriteSlugs(userId);
  return slugs.has(storySlug);
}
