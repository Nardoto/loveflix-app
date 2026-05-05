import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { findStory } from '@/lib/data/stories';
import { ebookPages } from '@/lib/data/ebook';
import { groupIntoChapters } from '@/lib/data/chapters';
import { getUser } from '@/lib/auth-helpers';

export default async function ReadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const story = findStory(slug);
  if (!story) notFound();
  if (!story.hasEbook) notFound();

  // Auth gate — same rule as /watch: catalog is public, content is gated.
  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/s/${slug}/read`)}`);
  }

  const { cover, chapters, final, totalWords } = groupIntoChapters(ebookPages);

  return (
    <ChapterReader
      story={story}
      cover={cover}
      chapters={chapters}
      final={final}
      totalWords={totalWords}
    />
  );
}
