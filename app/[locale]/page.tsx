import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { HeroCarousel } from '@/components/catalog/HeroCarousel';
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

  // Pick 4 hero slides — flagship first, then 3 hottest from the catalog.
  const heroStories = [
    fazendeiro,
    stories.find((s) => s.slug === 'the-mafias-bride')!,
    stories.find((s) => s.slug === 'the-wrong-groom')!,
    stories.find((s) => s.slug === 'boy-who-came-home-rich')!,
  ].filter(Boolean);

  // Build rows from the full catalog.
  const freeRow = allStories.filter((s) => s.isFree);
  const billionaireRow = stories.filter((s) => s.genre === 'billionaire');
  const mafiaRow = stories.filter((s) => s.genre === 'mafia');
  const forbiddenRow = stories.filter((s) => s.genre === 'forbidden');
  const secretBabyRow = stories.filter((s) => s.genre === 'secret_baby');
  const moodRow = stories.filter((s) => s.genre === 'mood');
  const topTenRow = allStories.slice(0, 10);

  return (
    <>
      <HeroCarousel stories={heroStories} />

      <AuthorPills />

      <HotShowcase stories={hotStories} />
      <Row title={t('topTen')} highlight="Top 10" stories={topTenRow} numbered />
      <Row title="Free to Listen" highlight="Free" stories={freeRow} />
      <Row title="Billionaire Romance" highlight="Billionaire" stories={billionaireRow} />
      <Row title="Mafia & Dark Romance" highlight="Mafia" stories={mafiaRow} />
      <Row title="Forbidden Stories" highlight="Forbidden" stories={forbiddenRow} />
      <Row title="Secret Baby" highlight="Secret" stories={secretBabyRow} />
      <Row title="Short Mood Pieces" highlight="Mood" stories={moodRow} />
    </>
  );
}
