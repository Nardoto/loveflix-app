import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { HeroFeatured } from '@/components/catalog/HeroFeatured';
import { Row } from '@/components/catalog/Row';
import { AuthorPills } from '@/components/catalog/AuthorPills';
import { HotShowcase } from '@/components/catalog/HotShowcase';
import { allStories, fazendeiro, stories } from '@/lib/data/stories';
import { hotStories } from '@/lib/data/hot';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home.rows');

  const freeRow = allStories.filter((s) => s.isFree);
  const billionaireRow = stories.filter((s) => s.genre === 'billionaire');
  const mafiaRow = stories.filter((s) => s.genre === 'mafia');
  const forbiddenRow = stories.filter((s) => s.genre === 'forbidden');
  const secretBabyRow = stories.filter((s) => s.genre === 'secret_baby');
  const moodRow = stories.filter((s) => s.genre === 'mood');
  const trendingRow = allStories.slice(0, 12);

  return (
    <>
      {/* Single editorial hero (no auto-rotating carousel — research is
          clear that motion-without-consent hurts comprehension for 55+). */}
      <HeroFeatured story={fazendeiro} />

      {/* Genre filtering already happens (a) per-row below and (b) via the
          /genres page in the main nav, so we don't double up with chips here.
          The author pills come right after the hero — channel-following is
          the primary discovery path on AllureTV. */}
      <AuthorPills />

      <HotShowcase stories={hotStories} />

      <Row title={t('trending')} highlight="Trending" stories={trendingRow} />
      <Row title="Free to Listen" highlight="Free" stories={freeRow} />
      <Row
        title="Billionaire Romance"
        highlight="Billionaire"
        stories={billionaireRow}
      />
      <Row title="Mafia & Dark Romance" highlight="Mafia" stories={mafiaRow} />
      <Row title="Forbidden Stories" highlight="Forbidden" stories={forbiddenRow} />
      <Row title="Secret Baby" highlight="Secret" stories={secretBabyRow} />
      <Row title="Short Mood Pieces" highlight="Mood" stories={moodRow} />
    </>
  );
}
