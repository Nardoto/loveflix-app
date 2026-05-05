'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, Plus, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Story } from '@/lib/data/stories';
import { isStoryHot } from '@/lib/data/hot';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { SparkleIcon } from '@/components/icons/SparkleIcon';

const GENRE_LABELS: Record<Story['genre'], string> = {
  mafia: 'Mafia Romance',
  billionaire: 'Billionaire Romance',
  forbidden: 'Forbidden Romance',
  secret_baby: 'Secret Baby',
  second_chance: 'Second Chance',
  arranged: 'Arranged Marriage',
  royal: 'Royal Romance',
  mood: 'Mood Piece',
};

export function HeroCarousel({ stories }: { stories: Story[] }) {
  const t = useTranslations('home.hero');
  const [index, setIndex] = useState(0);
  const total = stories.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % total), 7000);
    return () => clearInterval(id);
  }, [total]);

  const story = stories[index];
  if (!story) return null;

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <section className="group relative h-[80vh] min-h-[520px] md:h-[88vh] md:min-h-[640px] w-full overflow-hidden">
      {/* Layered backgrounds with fade for the rotation */}
      {stories.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={s.cover}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover scale-105"
          />
        </div>
      ))}

      {/* Dark + romance gradient overlay */}
      <div className="absolute inset-0 hero-overlay" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end pb-20 md:pb-32 px-5 md:px-10 lg:px-14 max-w-3xl">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          {isStoryHot(story) && (
            <Badge variant="hot">
              <FlameIcon className="size-3" />
              Hot
            </Badge>
          )}
          {story.isFree && (
            <Badge variant="free">
              <SparkleIcon className="size-3" />
              Free to listen
            </Badge>
          )}
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-gold-bright">
            {GENRE_LABELS[story.genre]}
          </span>
        </div>

        <h1 className="font-serif italic font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] tracking-tight mb-4 md:mb-5 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
          {story.title}
        </h1>

        <p className="text-base md:text-lg text-text-soft/90 max-w-xl line-clamp-3 md:line-clamp-4 mb-5 md:mb-7 leading-relaxed">
          {story.synopsis}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href={`/s/${story.slug}/watch` as never}>
              <Play className="fill-current" />
              {t('watchNow')}
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href={`/s/${story.slug}` as never}>
              <Info />
              {t('moreInfo')}
            </Link>
          </Button>
          <Button variant="glass" size="icon" aria-label={t('addToList')}>
            <Plus />
          </Button>
        </div>

        {/* Dots indicator — stays at bottom-right alone. */}
        {total > 1 && (
          <div className="absolute bottom-7 right-5 md:right-10 lg:right-14 flex gap-1.5 items-center">
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-12 bg-rose' : 'w-7 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* BIG side arrows — vertically centered. Title is left-padded so the
          left arrow at the very edge stays clear of the text on desktop. */}
      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 grid place-items-center size-14 md:size-16 rounded-full bg-black/50 backdrop-blur text-white/90 hover:bg-rose hover:scale-110 transition-all opacity-70 md:opacity-50 hover:opacity-100 group-hover:opacity-100 shadow-xl shadow-black/50"
          >
            <ChevronLeft className="size-9 md:size-10" strokeWidth={2.4} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 grid place-items-center size-14 md:size-16 rounded-full bg-black/50 backdrop-blur text-white/90 hover:bg-rose hover:scale-110 transition-all opacity-70 md:opacity-50 hover:opacity-100 group-hover:opacity-100 shadow-xl shadow-black/50"
          >
            <ChevronRight className="size-9 md:size-10" strokeWidth={2.4} />
          </button>
        </>
      )}
    </section>
  );
}
