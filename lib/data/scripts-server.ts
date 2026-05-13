// Server-side helpers pro reader in-app. Não cacheia per-story porque a
// invalidação por tag `script-${slug}` é precisa o suficiente; mas faz
// sentido cachear o lookup pra reduzir round-trips no Supabase quando
// muitas usuárias abrem o mesmo /read.

import 'server-only';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { buildKey } from '@/lib/r2';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export type Locale = 'en' | 'de' | 'fr' | 'es';

export type StoryScript = {
  content: string;
  wordCount: number;
  updatedAt: string;
  /** Locale efetivamente carregada. Pode diferir do solicitado se rolou fallback. */
  locale: Locale;
};

/**
 * Carrega o roteiro pra (slug, locale). Se não houver, tenta EN como fallback.
 * Retorna null se nenhuma das duas existe.
 */
export async function getStoryScript(
  slug: string,
  locale: Locale,
): Promise<StoryScript | null> {
  if (!SUPABASE_CONFIGURED) return null;
  return getStoryScriptCached(slug, locale);
}

const getStoryScriptCached = unstable_cache(
  async (slug: string, locale: Locale): Promise<StoryScript | null> => {
    try {
      const sb = createServiceClient();
      // Resolve story_id
      const { data: storyRow } = await sb
        .from('stories')
        .select('id')
        .eq('slug', slug)
        .single();
      if (!storyRow) return null;

      // Tenta a locale solicitada primeiro.
      const { data: scriptRow } = await sb
        .from('story_scripts')
        .select('content, word_count, updated_at, locale')
        .eq('story_id', storyRow.id)
        .eq('locale', locale)
        .maybeSingle();

      if (scriptRow && scriptRow.content) {
        return {
          content: scriptRow.content,
          wordCount: scriptRow.word_count ?? 0,
          updatedAt: scriptRow.updated_at,
          locale: scriptRow.locale as Locale,
        };
      }

      // Fallback EN.
      if (locale !== 'en') {
        const { data: fallback } = await sb
          .from('story_scripts')
          .select('content, word_count, updated_at, locale')
          .eq('story_id', storyRow.id)
          .eq('locale', 'en')
          .maybeSingle();
        if (fallback && fallback.content) {
          return {
            content: fallback.content,
            wordCount: fallback.word_count ?? 0,
            updatedAt: fallback.updated_at,
            locale: 'en',
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  },
  ['story-script-by-slug-locale'],
  // Invalidado por revalidateTag('script-<slug>') em scripts.ts.
  // O segundo tag genérico cobre updates em massa de catálogo.
  { tags: ['stories'], revalidate: 300 },
);

/**
 * Carrega todos os roteiros de uma story (todas as 4 locales) — usado pelo
 * admin pra montar as tabs e mostrar quais idiomas estão preenchidos.
 */
export async function getAllScriptsForStory(
  slug: string,
): Promise<Partial<Record<Locale, StoryScript>>> {
  if (!SUPABASE_CONFIGURED) return {};
  try {
    const sb = createServiceClient();
    const { data: storyRow } = await sb
      .from('stories')
      .select('id')
      .eq('slug', slug)
      .single();
    if (!storyRow) return {};

    const { data: rows } = await sb
      .from('story_scripts')
      .select('content, word_count, updated_at, locale')
      .eq('story_id', storyRow.id);
    if (!rows) return {};

    const out: Partial<Record<Locale, StoryScript>> = {};
    for (const r of rows as Array<{
      content: string;
      word_count: number;
      updated_at: string;
      locale: string;
    }>) {
      const l = r.locale as Locale;
      out[l] = {
        content: r.content,
        wordCount: r.word_count ?? 0,
        updatedAt: r.updated_at,
        locale: l,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Lista as N keys de imagens da galeria de uma story. Determinístico —
 * apenas gera os caminhos baseado no count salvo em stories.ebook_image_count.
 * O reader usa essas keys pra montar URLs assinadas.
 */
export function listEbookImageKeys(slug: string, count: number): string[] {
  if (count <= 0) return [];
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(
      buildKey({
        storySlug: slug,
        bookNumber: 1,
        kind: 'ebook-image',
        pageIndex: i, // 0-based
      }),
    );
  }
  return keys;
}
