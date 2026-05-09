// Server-side catalog loader. Reads from Supabase when populated, falls
// back to the hardcoded module otherwise — so a fresh deploy without a
// seed run still renders a non-empty home.
//
// All helpers mirror the synchronous shape of lib/data/stories.ts but
// are async. Server components await them; client components keep using
// the static module (which is synchronously importable).

import 'server-only';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { allStories as hardcoded, type Story, type Genre } from './stories';
import { isStoryHot } from './hot';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

type RawStoryRow = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  cover_key: string | null;
  genre: Story['genre'];
  tropes: string[] | null;
  synopsis: string;
  is_free: boolean;
  is_premium: boolean;
  is_hot: boolean;
  is_coming_soon: boolean;
  age_rating: string | null;
  total_minutes: number | null;
  has_ebook: boolean;
  video_src: string | null;
  video_key: string | null;
  ebook_key: string | null;
  published_at: string | null;
  created_at: string;
  story_audio?: Array<{
    locale: 'en' | 'de' | 'fr' | 'es';
    audio_src: string | null;
    audio_key: string | null;
  }>;
};

function rowToStory(row: RawStoryRow): Story {
  const audioByLocale: Record<string, string> = {};
  const audioKeyByLocale: Record<string, string> = {};
  for (const a of row.story_audio ?? []) {
    if (a.audio_src) audioByLocale[a.locale] = a.audio_src;
    if (a.audio_key) audioKeyByLocale[a.locale] = a.audio_key;
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cover: row.cover,
    coverKey: row.cover_key ?? undefined,
    genre: row.genre,
    tropes: row.tropes ?? [],
    synopsis: row.synopsis,
    isFree: row.is_free || undefined,
    isPremium: row.is_premium || undefined,
    isHot: row.is_hot || undefined,
    isComingSoon: row.is_coming_soon || undefined,
    ageRating: row.age_rating ?? '18+',
    totalMinutes: row.total_minutes ?? 45,
    hasEbook: row.has_ebook || undefined,
    videoSrc: row.video_src ?? undefined,
    videoKey: row.video_key ?? undefined,
    ebookKey: row.ebook_key ?? undefined,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? undefined,
    audioByLocale: Object.keys(audioByLocale).length ? audioByLocale : undefined,
    audioKeyByLocale: Object.keys(audioKeyByLocale).length
      ? audioKeyByLocale
      : undefined,
  };
}

async function loadFromSupabase(): Promise<Story[] | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('stories')
      .select('*, story_audio(locale, audio_src, audio_key)')
      // DESC: novidades em destaque (Hero, Trending, Hot, rows de gênero
      // pegam os primeiros N — usuária precisa ver o que acabou de chegar).
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return (data as RawStoryRow[]).map(rowToStory);
  } catch {
    return null;
  }
}

/**
 * Cached fetch — invalidated whenever the admin calls
 * revalidateTag('stories') after a write.
 */
export const getAllStories = unstable_cache(
  async (): Promise<Story[]> => {
    const fromDb = await loadFromSupabase();
    return fromDb ?? hardcoded;
  },
  ['stories-catalog'],
  { tags: ['stories'], revalidate: 60 },
);

export async function getStoryBySlug(slug: string): Promise<Story | undefined> {
  const all = await getAllStories();
  return all.find((s) => s.slug === slug);
}

export async function getStoriesByGenre(genre: Genre): Promise<Story[]> {
  const all = await getAllStories();
  return all.filter((s) => s.genre === genre);
}

export async function getHotStories(): Promise<Story[]> {
  const all = await getAllStories();
  return all.filter(isStoryHot);
}

export async function getHotStoriesByGenre(genre: Genre): Promise<Story[]> {
  const hot = await getHotStories();
  return hot.filter((s) => s.genre === genre);
}

export async function getFreeStories(): Promise<Story[]> {
  const all = await getAllStories();
  return all.filter((s) => s.isFree);
}

export type StoryMetrics = {
  commentCount: number;
  ratedCount: number;
  avgRating: number;
};

/**
 * Métricas por story pra lista admin (estilo YouTube Studio).
 * Agrega story_comments em memória — escala bem pra ~poucos milhares de
 * comments. Quando passar disso, criar uma RPC server-side ou migrar pra
 * `story_rating_aggregate` view (precisa GRANT extra).
 */
export async function getStoryMetrics(): Promise<Map<string, StoryMetrics>> {
  const out = new Map<string, StoryMetrics>();
  if (!SUPABASE_CONFIGURED) return out;
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('story_comments')
      .select('story_slug, stars');
    if (!data) return out;

    const buckets = new Map<string, { sum: number; rated: number; total: number }>();
    for (const row of data as Array<{ story_slug: string; stars: number | null }>) {
      const b = buckets.get(row.story_slug) ?? { sum: 0, rated: 0, total: 0 };
      b.total += 1;
      if (row.stars != null) {
        b.sum += row.stars;
        b.rated += 1;
      }
      buckets.set(row.story_slug, b);
    }
    for (const [slug, b] of buckets) {
      out.set(slug, {
        commentCount: b.total,
        ratedCount: b.rated,
        avgRating: b.rated > 0 ? b.sum / b.rated : 0,
      });
    }
  } catch {
    /* keep empty map */
  }
  return out;
}
