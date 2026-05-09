import Image from 'next/image';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Clock, Headphones } from 'lucide-react';
import { Row } from '@/components/catalog/Row';
import { allStories, type Story } from '@/lib/data/stories';
import { filterByLocale } from '@/lib/data/locale-filter';

export const dynamic = 'force-dynamic';

const GENRE_META: Record<Story['genre'], { label: string; tagline: string; description: string }> = {
  mafia: {
    label: 'Mafia & Dark',
    tagline: 'Possession dressed in tailored black',
    description: 'Forced marriages, family feuds, and the kind of love that comes with a pistol on the bedside table. For when the slow-burn you want is more bonfire than candle.',
  },
  billionaire: {
    label: 'Billionaire Romance',
    tagline: 'Boardrooms, jets and one-tap surrender',
    description: "He hires her. She wakes up his fiancée. Power-imbalance romance with sharp suits, late-night offices, and contracts neither one of them ends up reading.",
  },
  forbidden: {
    label: 'Forbidden Love',
    tagline: 'The line they can never quite stop crossing',
    description: 'Doctors and priests, brothers-in-law and tutors, masters and maids — stories built around the one rule the heart refuses to follow.',
  },
  secret_baby: {
    label: 'Secret Baby',
    tagline: 'A small hand, six years late',
    description: "Reunion stories where the past walked back through the door — and brought a child he never knew about. Tears guaranteed.",
  },
  second_chance: {
    label: 'Second Chance',
    tagline: 'The one who came back changed',
    description: 'Letters from 1962, ex-lovers at weddings, the small-town boy who left in a borrowed jacket and came back in a black car. Love that took the long way home.',
  },
  arranged: {
    label: 'Arranged Marriage',
    tagline: 'Two strangers, one signed contract',
    description: 'Marriages of convenience that catch fire anyway. The vow first, the want second.',
  },
  royal: {
    label: 'Royal Romance',
    tagline: 'Crowns, gardens, mistaken identities',
    description: 'Kingdoms, palaces and the commoner who walked into the wrong garden at the right moment.',
  },
  mood: {
    label: 'Short Mood Pieces',
    tagline: 'For the long drive home',
    description: 'Twelve-minute audio singles. A red satin morning. A jet at sunset. Pure atmosphere — narrative espresso.',
  },
};

const isGenre = (s: string): s is Story['genre'] =>
  s in GENRE_META;

export function generateStaticParams() {
  return Object.keys(GENRE_META).map((genre) => ({ genre }));
}

export default async function GenreDetailPage({
  params,
}: {
  params: Promise<{ locale: string; genre: string }>;
}) {
  const { locale, genre } = await params;
  setRequestLocale(locale);

  if (!isGenre(genre)) notFound();

  const meta = GENRE_META[genre];
  const list = filterByLocale(
    allStories.filter((s) => s.genre === genre),
    locale,
  );
  const featured = list.find((s) => s.isHot) ?? list[0];

  if (!featured) notFound();

  const totalMin = list.reduce((acc, s) => acc + (s.totalMinutes ?? 0), 0);
  const avgMin = Math.round(totalMin / list.length);

  const hot = list.filter((s) => s.isHot);

  return (
    <>
      {/* Genre hero */}
      <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden">
        <Image
          src={featured.cover}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover scale-105"
        />
        <div className="absolute inset-0 hero-overlay" />

        <div className="relative h-full flex flex-col justify-end pb-12 md:pb-16 px-5 md:px-10 lg:px-14 max-w-3xl">
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-gold-bright mb-2">
            Genre
          </p>
          <h1 className="font-serif italic font-black text-3xl sm:text-5xl md:text-6xl text-white leading-tight tracking-tight mb-3 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            {meta.label}
          </h1>
          <p className="font-serif italic text-lg md:text-xl text-rose-bright mb-3">
            {meta.tagline}
          </p>
          <p className="text-base text-text-soft/95 max-w-2xl leading-relaxed mb-5">
            {meta.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Stat icon={<Headphones />} value={`${list.length} stor${list.length === 1 ? 'y' : 'ies'}`} />
            <Stat icon={<Clock />} value={`avg ${avgMin} min`} />
            <Stat value={`${totalMin.toLocaleString()} min total`} />
          </div>
        </div>
      </section>

      <Row title={`All ${meta.label}`} highlight="All" stories={list} />

      {hot.length >= 2 && (
        <Row title="Hot in this genre" highlight="Hot" stories={hot} />
      )}
    </>
  );
}

function Stat({ icon, value }: { icon?: React.ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-semibold">
      {icon && <span className="[&_svg]:size-4 text-white/80">{icon}</span>}
      <span>{value}</span>
    </div>
  );
}
