import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { findStory } from '@/lib/data/stories';
import { ebookPages } from '@/lib/data/ebook';
import { groupIntoChapters } from '@/lib/data/chapters';

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
