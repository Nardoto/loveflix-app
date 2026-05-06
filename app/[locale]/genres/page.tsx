import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { allStories, type Story } from '@/lib/data/stories';
import { filterByLocale } from '@/lib/data/locale-filter';

const GENRES: { id: Story['genre']; label: string; tagline: string }[] = [
  { id: 'mafia', label: 'Mafia & Dark', tagline: 'Forced unions and possessive grooms' },
  { id: 'billionaire', label: 'Billionaire', tagline: 'Power suits and late-night offices' },
  { id: 'forbidden', label: 'Forbidden Love', tagline: 'Doctors, priests and stolen kitchens' },
  { id: 'secret_baby', label: 'Secret Baby', tagline: 'Hidden children and reunions at the altar' },
  { id: 'second_chance', label: 'Second Chance', tagline: 'The one who came back rich' },
  { id: 'arranged', label: 'Arranged Marriage', tagline: 'Two strangers, one signed contract' },
  { id: 'royal', label: 'Royal Romance', tagline: 'Crowns, gardens and mistaken identities' },
  { id: 'mood', label: 'Short Mood Pieces', tagline: 'Twelve-minute audiobooks for the long drive home' },
];

export default async function GenresIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const localeAll = filterByLocale(allStories, locale);

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-7xl mx-auto pb-20">
      <header className="mb-10 md:mb-12 text-center md:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-bright mb-2">
          Genres
        </p>
        <h1 className="font-serif italic text-3xl md:text-5xl font-black text-white mb-3">
          Browse by Genre
        </h1>
        <p className="text-text-dim text-base md:text-lg max-w-2xl">
          Eight romance worlds to fall into. Pick a flavor.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {GENRES.map((g) => {
          const list = localeAll.filter((s) => s.genre === g.id);
          const covers = list.slice(0, 4).map((s) => s.cover);
          return (
            <Link
              key={g.id}
              href={`/genres/${g.id}` as never}
              className="group relative overflow-hidden rounded-3xl shadow-2xl shadow-black/40 hover:shadow-rose/30 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Mosaic background */}
              <div className="absolute inset-0 bg-black/60">
                {covers.length === 4 ? (
                  <div className="grid grid-cols-2 grid-rows-2 gap-px h-full">
                    {covers.map((src, i) => (
                      <div key={i} className="relative">
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : covers[0] ? (
                  <Image
                    src={covers[0]}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-rose to-rose-deep" />
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />

              <div className="relative p-5 md:p-7 min-h-[220px] flex flex-col justify-end">
                <h2 className="font-serif italic font-black text-2xl md:text-3xl text-white mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                  {g.label}
                </h2>
                <p className="text-sm text-white/80 mb-3">{g.tagline}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-bright">
                  {list.length} stor{list.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
