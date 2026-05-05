import { notFound } from 'next/navigation';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Bell, Heart, Headphones, Star } from 'lucide-react';

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Row } from '@/components/catalog/Row';
import { allStories, type Story } from '@/lib/data/stories';
import { findAuthor, filterByAuthor, getAuthorFor, authors } from '@/lib/data/authors';

const GENRE_LABELS: Record<Story['genre'], string> = {
  mafia: 'Mafia & Dark',
  billionaire: 'Billionaire',
  forbidden: 'Forbidden',
  secret_baby: 'Secret Baby',
  second_chance: 'Second Chance',
  arranged: 'Arranged Marriage',
  royal: 'Royal',
  mood: 'Mood Pieces',
};

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const author = findAuthor(id);
  if (!author) notFound();

  const channelStories = filterByAuthor(allStories, id);

  // Deterministic mock numbers seeded from author id
  const seed = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const subscribers = (8 + (seed % 23)) * 1000 + (seed * 31) % 999; // ~8K-31K
  const totalMinutes = channelStories.reduce((acc, s) => acc + (s.totalMinutes ?? 45), 0);
  const reviewsCount = 320 + (seed * 17) % 4200;
  const avgRating = 4.4 + (seed % 6) / 10;

  // Genres this author covers (deduped)
  const genres = Array.from(new Set(channelStories.map((s) => s.genre)));

  // Cross-promotion picks — 4 stories from OTHER channels
  const otherChannels = authors.filter((a) => a.id !== id);
  const crossPromo: { story: Story; from: typeof author }[] = [];
  for (const a of otherChannels) {
    const pick = filterByAuthor(allStories, a.id)[0];
    if (pick) crossPromo.push({ story: pick, from: a });
    if (crossPromo.length === 4) break;
  }

  // Featured cover for hero parallax — first hot story or first one
  const featuredCover =
    channelStories.find((s) => s.isHot)?.cover ?? channelStories[0]?.cover;

  return (
    <>
      {/* Channel hero — gradient panel with featured cover blended in */}
      <section className="relative h-[60vh] min-h-[460px] w-full overflow-hidden">
        {featuredCover && (
          <Image
            src={featuredCover}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30 scale-110"
          />
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${author.color} mix-blend-soft-light opacity-90`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-deep/30 via-black/50 to-bg-deep" />

        <div className="relative h-full flex flex-col justify-end pb-12 md:pb-16 px-5 md:px-10 lg:px-14 max-w-4xl">
          <div className="flex items-center gap-4 md:gap-6 mb-5">
            <div
              className={`relative size-20 md:size-28 rounded-full overflow-hidden shadow-2xl shadow-black/60 bg-gradient-to-br ${author.color}`}
            >
              <Image
                src={author.avatar}
                alt={author.name}
                fill
                sizes="(max-width: 768px) 80px, 112px"
                priority
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/70 mb-1">
                {author.tagline}
              </p>
              <h1 className="font-serif italic font-black text-3xl sm:text-5xl md:text-6xl text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
                {author.name}
              </h1>
            </div>
          </div>

          <p className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed mb-6">
            {author.bio}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Stat icon={<Headphones />} value={`${channelStories.length} stories`} />
            <Stat icon={<Star />} value={`${avgRating.toFixed(1)} · ${reviewsCount.toLocaleString()} reviews`} />
            <Stat icon={<Heart />} value={`${subscribers.toLocaleString()} fans`} />
            <Stat value={`${totalMinutes.toLocaleString()} total min`} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="rose" size="lg">
              <Bell /> Subscribe
            </Button>
            <Button asChild variant="glass" size="lg">
              <a
                href={author.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Watch ${author.name} on YouTube`}
              >
                <YoutubeIcon className="size-5 text-red-500" /> Watch on YouTube
              </a>
            </Button>
            <Button variant="glass" size="lg">
              <Heart /> Follow
            </Button>
          </div>
        </div>
      </section>

      {channelStories.length === 0 ? (
        <section className="px-5 md:px-10 lg:px-14 mt-12 max-w-2xl">
          <div className="bg-bg-card rounded-2xl p-8 text-center shadow-2xl shadow-black/40">
            <p className="font-serif italic text-xl text-white mb-2">
              {author.name} is recording new stories now.
            </p>
            <p className="text-text-dim text-sm">
              Subscribe to be notified when the first audiobook drops.
            </p>
          </div>
        </section>
      ) : (
        <>
          <Row
            title={`Latest from ${author.name}`}
            highlight={author.name}
            stories={[...channelStories].reverse().slice(0, 12)}
          />
          <Row
            title="Top stories"
            highlight="Top"
            stories={channelStories.slice(0, 10)}
          />
          {genres.map((g) => {
            const list = channelStories.filter((s) => s.genre === g);
            if (list.length < 2) return null;
            return (
              <Row
                key={g}
                title={`${GENRE_LABELS[g]}`}
                highlight={GENRE_LABELS[g].split(' ')[0]}
                stories={list}
              />
            );
          })}

          {/* Cross-promotion when channel has narrow genre coverage */}
          {genres.length <= 3 && crossPromo.length > 0 && (
            <section className="px-4 md:px-10 mt-10 md:mt-14">
              <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-extrabold text-white mb-3 md:mb-4 tracking-tight">
                More from <em className="text-rose not-italic font-serif italic">other channels</em>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {crossPromo.map(({ story, from }) => (
                  <Link
                    key={story.id}
                    href={`/s/${story.slug}` as never}
                    className="card-hover group relative rounded-xl overflow-hidden bg-bg-card shadow-lg shadow-black/40"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={story.cover}
                        alt={story.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                      <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full bg-black/60 backdrop-blur">
                        <span
                          className={`relative size-5 rounded-full overflow-hidden bg-gradient-to-br ${from.color}`}
                        >
                          <Image
                            src={from.avatar}
                            alt=""
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          {from.tagline}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <h3 className="font-serif text-sm md:text-base font-bold italic text-white leading-tight line-clamp-2">
                          {story.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Stat({ icon, value }: { icon?: React.ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/15 backdrop-blur text-white/90 text-sm font-semibold">
      {icon && <span className="[&_svg]:size-4 text-white/80">{icon}</span>}
      <span>{value}</span>
    </div>
  );
}
