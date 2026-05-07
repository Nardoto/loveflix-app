import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Row } from '@/components/catalog/Row';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { hotStories, hotByGenre } from '@/lib/data/hot';
import { filterByLocale } from '@/lib/data/locale-filter';
import type { Story } from '@/lib/data/stories';

export const dynamic = 'force-dynamic';

export default async function HotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const localeHot = filterByLocale(hotStories, locale);
  const featured = localeHot[0];
  const hotByGenreInLocale = (g: Story['genre']) =>
    filterByLocale(hotByGenre(g), locale);

  return (
    <>
      {/* HOT hero — fire palette, distinct from the regular hero */}
      <section className="relative h-[60vh] min-h-[480px] w-full overflow-hidden flex flex-col justify-end">
        {featured && (
          <Image
            src={featured.cover}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25 scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/90 via-bg-deep/80 to-orange-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_55%,rgba(220,38,38,0.45),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-deep to-transparent" />

        <div className="relative z-10 px-5 md:px-10 lg:px-14 pb-12 md:pb-16 max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <FlameIcon flicker className="size-12 md:size-16 text-orange-400" />
            <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.4em] text-orange-300">
              Curated by AllureTV
            </span>
          </div>

          <h1 className="font-serif italic font-black text-6xl md:text-8xl lg:text-9xl leading-none tracking-tight mb-4">
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,100,40,0.5)]">
              HOT
            </span>
          </h1>

          <p className="font-serif italic text-2xl md:text-3xl text-orange-200 mb-4 leading-tight">
            Our spiciest stories. Pure flame.
          </p>

          <p className="text-base md:text-lg text-text-soft/95 max-w-2xl leading-relaxed mb-6">
            Forced unions and possessive grooms. Forbidden trysts and slow-burn surrenders.
            Every story here is hand-picked for one reason: it&apos;ll make you forget what time it is.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Stat value={`${localeHot.length} stories`} />
            <Stat value="18+ only" />
          </div>
        </div>
      </section>

      <SubRow title="Hot Mafia" highlight="Mafia" stories={hotByGenreInLocale('mafia')} />
      <SubRow title="Hot Forbidden" highlight="Forbidden" stories={hotByGenreInLocale('forbidden')} />
      <SubRow title="Hot Secret Baby" highlight="Secret" stories={hotByGenreInLocale('secret_baby')} />
      <SubRow title="Hot Billionaire" highlight="Billionaire" stories={hotByGenreInLocale('billionaire')} />
      <SubRow title="Hot Arranged" highlight="Arranged" stories={hotByGenreInLocale('arranged')} />
      <SubRow title="Hot Second Chance" highlight="Second" stories={hotByGenreInLocale('second_chance')} />
    </>
  );
}

function SubRow({
  title,
  highlight,
  stories,
}: {
  title: string;
  highlight: string;
  stories: ReturnType<typeof hotByGenre>;
}) {
  if (stories.length === 0) return null;
  return <Row title={title} highlight={highlight} stories={stories} />;
}

function Stat({ value }: { value: string }) {
  return (
    <div className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-semibold">
      <span>{value}</span>
    </div>
  );
}
