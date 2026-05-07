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
import { getAuthorFor } from './authors';

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
      .order('created_at', { ascending: true });
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

export async function getStoriesByAuthor(authorId: string): Promise<Story[]> {
  const all = await getAllStories();
  return all.filter((s) => getAuthorFor(s).id === authorId);
}

export async function getFreeStories(): Promise<Story[]> {
  const all = await getAllStories();
  return all.filter((s) => s.isFree);
}
