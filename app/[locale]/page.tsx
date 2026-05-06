import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { HeroCarousel } from '@/components/catalog/HeroCarousel';
import { Row } from '@/components/catalog/Row';
import { AuthorPills } from '@/components/catalog/AuthorPills';
import { HotShowcase } from '@/components/catalog/HotShowcase';
import { allStories, fazendeiro, magnata, stories } from '@/lib/data/stories';
import { hotStories } from '@/lib/data/hot';
import { filterByLocale, isAvailableInLocale } from '@/lib/data/locale-filter';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home.rows');
  const tHero = await getTranslations('home.hero');

  // Hide stories whose audio isn't available in the current locale (German-
  // only and French-only uploads disappear from the EN/ES home, etc.).
  // Coming-soon placeholders stay visible across locales — they have no
  // audio yet and serve as aspirational catalog filler.
  const localeStories = filterByLocale(stories, locale);
  const localeAllStories = filterByLocale(allStories, locale);
  const localeHotStories = filterByLocale(hotStories, locale);

  const freeRow = localeAllStories.filter((s) => s.isFree);
  const billionaireRow = localeStories.filter((s) => s.genre === 'billionaire');
  const mafiaRow = localeStories.filter((s) => s.genre === 'mafia');
  const forbiddenRow = localeStories.filter((s) => s.genre === 'forbidden');
  const secretBabyRow = localeStories.filter((s) => s.genre === 'secret_baby');
  const moodRow = localeStories.filter((s) => s.genre === 'mood');
  const trendingRow = localeAllStories.slice(0, 12);

  // Hero carousel — flagship titles + a few of the latest playable releases
  // available in this locale. Flagships only appear when their audio covers
  // this locale (fazendeiro and magnata both ship en/de/fr/es, so they're
  // global in practice). Manual nav only (no auto-rotation) to respect the
  // 55+ audience guidance.
  const heroSlides = [
    ...(isAvailableInLocale(fazendeiro, locale) ? [fazendeiro] : []),
    ...(isAvailableInLocale(magnata, locale) ? [magnata] : []),
    ...localeStories.filter((s) => s.videoKey).slice(0, 4),
  ];

  return (
    <>
      <HeroCarousel
        stories={heroSlides}
        labels={{ watchNow: tHero('watchNow'), moreInfo: tHero('moreInfo') }}
      />

      {/* Genre filtering already happens (a) per-row below and (b) via the
          /genres page in the main nav, so we don't double up with chips here.
          The author pills come right after the hero — channel-following is
          the primary discovery path on AllureTV. */}
      <AuthorPills />

      <HotShowcase stories={localeHotStories} />

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
