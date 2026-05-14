'use server';

// Server actions de "Minha Lista" — usuária loga, salva story, vê em /list.
//
// Toda mutation chama revalidateTag('favorites') pra invalidar o cache do
// helper getFavoriteSlugs() em lib/data/favorites-server.ts. O servidor
// resolve o story_id por slug — o cliente nunca precisa saber o id.

import { revalidateTag } from 'next/cache';
import { getUser } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

async function resolveStoryId(slug: string): Promise<string | null> {
  const sb = createServiceClient();
  // maybeSingle: aceita 0 linhas (data=null, sem erro). `.single()` dava erro
  // pra qualquer count != 1, escondendo o motivo (0 vs >1).
  const { data, error } = await sb
    .from('stories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[favorites.resolveStoryId] query failed', { slug, error });
    return null;
  }
  if (!data) {
    console.warn('[favorites.resolveStoryId] no story for slug', { slug });
    return null;
  }
  return data.id;
}

export async function addFavorite(storySlug: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const storyId = await resolveStoryId(storySlug);
  if (!storyId) return { ok: false, error: `Story não encontrada (slug=${storySlug})` };

  const sb = createServiceClient();
  // Idempotente: upsert evita erro 23505 quando a usuária clica duas vezes.
  const { error } = await sb
    .from('favorites')
    .upsert({ user_id: user.id, story_id: storyId }, { onConflict: 'user_id,story_id' });
  if (error) {
    console.error('[favorites.addFavorite] upsert failed', {
      userId: user.id,
      storyId,
      slug: storySlug,
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
    });
    return { ok: false, error: `${error.code ?? 'ERR'}: ${error.message}` };
  }

  revalidateTag('favorites', { expire: 0 });
  return { ok: true };
}

export async function removeFavorite(storySlug: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const storyId = await resolveStoryId(storySlug);
  if (!storyId) return { ok: false, error: `Story não encontrada (slug=${storySlug})` };

  const sb = createServiceClient();
  const { error } = await sb
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('story_id', storyId);
  if (error) {
    console.error('[favorites.removeFavorite] delete failed', {
      userId: user.id,
      storyId,
      slug: storySlug,
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
    });
    return { ok: false, error: `${error.code ?? 'ERR'}: ${error.message}` };
  }

  revalidateTag('favorites', { expire: 0 });
  return { ok: true };
}
