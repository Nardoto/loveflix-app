import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { HeroCarousel } from '@/components/catalog/HeroCarousel';
import { Row } from '@/components/catalog/Row';
import { HotShowcase } from '@/components/catalog/HotShowcase';
import { getAllStories } from '@/lib/data/stories-server';
import { isStoryHot } from '@/lib/data/hot';
import { filterByLocale, isAvailableInLocale } from '@/lib/data/locale-filter';

// Renderiza a home a cada request (sem cache de CDN nem de browser).
// O catálogo em si continua cacheado em unstable_cache(stories, 60s)
// dentro de stories-server.ts — então é rápido — mas o HTML é fresco.
// Esse é o padrão YouTube/Netflix: HTML dinâmico, dados cacheados em
// memória do servidor. Sem isso, novos uploads do admin demorariam até
// 5 min pra aparecer na home (cache de edge da Vercel).
export const dynamic = 'force-dynamic';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home.rows');
  const tHero = await getTranslations('home.hero');
  const tHl = await getTranslations('home.highlights');

  // Read from Supabase (with hardcoded fallback when the table is empty —
  // a fresh deploy still renders a non-blank home).
  const all = await getAllStories();
  // Reproduce the legacy split: `stories` excluded the two flagships +
  // placeholders. After migration both sets are mixed; we just filter on
  // the genre rows below — no need to slice anymore.
  const localeAll = filterByLocale(all, locale);
  const localeHot = localeAll.filter(isStoryHot);

  const freeRow = localeAll.filter((s) => s.isFree);
  const billionaireRow = localeAll.filter((s) => s.genre === 'billionaire');
  const mafiaRow = localeAll.filter((s) => s.genre === 'mafia');
  const forbiddenRow = localeAll.filter((s) => s.genre === 'forbidden');
  const secretBabyRow = localeAll.filter((s) => s.genre === 'secret_baby');
  const moodRow = localeAll.filter((s) => s.genre === 'mood');
  const trendingRow = localeAll.slice(0, 12);

  // Hero carousel — flagship titles + the latest playable releases
  // available in this locale. We pick the flagships explicitly by id then
  // top up with newer releases that have a real videoKey set. Manual nav
  // only (no auto-rotation) to respect the 55+ audience guidance.
  const fazendeiro = all.find((s) => s.id === 'fazendeiro');
  const magnata = all.find((s) => s.id === 'magnata');
  const heroSlides = [
    ...(fazendeiro && isAvailableInLocale(fazendeiro, locale) ? [fazendeiro] : []),
    ...(magnata && isAvailableInLocale(magnata, locale) ? [magnata] : []),
    ...localeAll
      .filter(
        (s) => s.videoKey && s.id !== 'fazendeiro' && s.id !== 'magnata',
      )
      .slice(0, 4),
  ];

  return (
    <>
      <HeroCarousel
        stories={heroSlides}
        labels={{ watchNow: tHero('watchNow'), moreInfo: tHero('moreInfo') }}
      />

      <HotShowcase stories={localeHot} />

      <Row title={t('trending')} highlight={tHl('trending')} stories={trendingRow} />
      <Row title={t('free')} highlight={tHl('free')} stories={freeRow} />
      <Row
        title={t('billionaire')}
        highlight={tHl('billionaire')}
        stories={billionaireRow}
      />
      <Row title={t('mafia')} highlight={tHl('mafia')} stories={mafiaRow} />
      <Row title={t('forbidden')} highlight={tHl('forbidden')} stories={forbiddenRow} />
      <Row title={t('secretBaby')} highlight={tHl('secret')} stories={secretBabyRow} />
      <Row title={t('mood')} highlight={tHl('mood')} stories={moodRow} />
    </>
  );
}
