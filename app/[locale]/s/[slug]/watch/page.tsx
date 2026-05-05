import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Player } from '@/components/player/Player';
import { findStory } from '@/lib/data/stories';

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale, slug } = await params;
  const { mode } = await searchParams;
  setRequestLocale(locale);

  const story = findStory(slug);
  if (!story) notFound();
  if (!story.videoSrc && !story.audioByLocale && !story.videoKey && !story.audioKeyByLocale) notFound();

  const initialMode = mode === 'video' ? 'video' : 'audio';

  return <Player story={story} initialMode={initialMode} initialLocale={locale} />;
}
