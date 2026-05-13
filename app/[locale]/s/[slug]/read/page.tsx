import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { ebookPages } from '@/lib/data/ebook';
import { groupIntoChapters } from '@/lib/data/chapters';
import { getUser, isSubscriber } from '@/lib/auth-helpers';

export default async function ReadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  if (!story.hasEbook) notFound();

  // Auth gate — same rule as /watch: catalog is public, content is gated.
  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/s/${slug}/read`)}`);
  }

  // Premium gate antes de qualquer redirect pro PDF.
  if (story.isPremium && !story.isFree) {
    const sub = await isSubscriber();
    if (!sub) {
      const from = `/${locale}/s/${slug}`;
      redirect(`/${locale}/account?upgrade=required&from=${encodeURIComponent(from)}`);
    }
  }

  // Story tem PDF subido pelo admin — manda direto pro download. O reader
  // hardcoded só serve as stories antigas (legadas) que têm has_ebook=true
  // sem ebook_key. (PDF in-app viewer entra no Bloco E, depois.)
  if (story.ebookKey) {
    redirect(`https://${process.env.NEXT_PUBLIC_MEDIA_DOMAIN}/${story.ebookKey}`);
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
