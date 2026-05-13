'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Play, Info, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { isStoryHot } from '@/lib/data/hot';
import type { Story } from '@/lib/data/stories';
import type { SubscriptionTier } from '@/lib/auth-helpers';
import { storyRequiresUpgrade } from '@/lib/auth-helpers';

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

// Disney+ style hero carousel with infinite loop. We render the original
// slide list flanked by a clone of the last slide at the start and a clone
// of the first slide at the end. After a smooth scroll lands on a clone,
// we silently teleport scrollLeft to the matching real slide so the loop
// is seamless. NO auto-rotation — the 55+ audience research is consistent
// that motion-without-consent hurts comprehension; user advances explicitly.
type Props = {
  stories: Story[];
  labels: { watchNow: string; moreInfo: string; lockedCta: string };
  userTier?: SubscriptionTier | null;
};

export function HeroCarousel({ stories, labels, userTier }: Props) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const settlingRef = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;

  const N = stories.length;
  // Slides as displayed: [last, ...stories, first]. The +2 sentinels are
  // what make the loop seamless: when the user scrolls to either clone,
  // we teleport to the matching real slide before they notice.
  const displaySlides = N > 1 ? [stories[N - 1], ...stories, stories[0]] : stories;

  // Track position uses indices in `displaySlides`. Real slide 0 sits at
  // position 1 (because position 0 is the leading clone). Real slide i is
  // at position i+1.
  const realToPos = useCallback((real: number) => (N > 1 ? real + 1 : real), [N]);
  const posToReal = useCallback(
    (pos: number) => {
      if (N <= 1) return 0;
      if (pos === 0) return N - 1;
      if (pos === N + 1) return 0;
      return pos - 1;
    },
    [N],
  );

  // Initial position: scroll past the leading clone so the user starts on
  // the first real slide. Re-anchor on resize since clientWidth changed.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || N <= 1) return;
    const place = () => {
      el.scrollLeft = el.clientWidth * realToPos(indexRef.current);
    };
    place();
    const onResize = () => {
      settlingRef.current = true;
      place();
      // 60ms is enough for the scroll event from the assignment to flush
      // before we re-enable normal scroll handling.
      setTimeout(() => {
        settlingRef.current = false;
      }, 60);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [N, realToPos]);

  // Watch scroll: update visible index while scrolling, and after the
  // scroll settles, teleport off any clone slide.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || N <= 1) return;
    let raf = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (settlingRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w === 0) return;
        const pos = Math.round(el.scrollLeft / w);
        setIndex(posToReal(pos));
      });

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const w = el.clientWidth;
        if (w === 0) return;
        const pos = Math.round(el.scrollLeft / w);
        if (pos === 0) {
          // Landed on the clone of the last slide → teleport to the real
          // last slide (same image on screen, so no visual change).
          settlingRef.current = true;
          el.scrollLeft = w * N;
          setTimeout(() => {
            settlingRef.current = false;
          }, 50);
        } else if (pos === N + 1) {
          settlingRef.current = true;
          el.scrollLeft = w;
          setTimeout(() => {
            settlingRef.current = false;
          }, 50);
        }
      }, 160);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [N, posToReal]);

  const goTo = useCallback(
    (real: number) => {
      const el = trackRef.current;
      if (!el) return;
      const wrapped = ((real % N) + N) % N;
      el.scrollTo({
        left: el.clientWidth * realToPos(wrapped),
        behavior: 'smooth',
      });
    },
    [N, realToPos],
  );

  const advance = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
    },
    [],
  );

  if (!N) return null;

  return (
    <section className="relative w-full pt-2 md:pt-3">
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-roledescription="carousel"
      >
        {displaySlides.map((story, i) => (
          <div
            key={`${story.id}-${i}`}
            className="flex-shrink-0 w-full snap-start px-3 sm:px-6 md:px-10 lg:px-14"
            aria-roledescription="slide"
            aria-hidden={N > 1 && (i === 0 || i === N + 1) ? 'true' : undefined}
          >
            <Slide story={story} labels={labels} userTier={userTier} />
          </div>
        ))}
      </div>

      {N > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => advance(-1)}
            className="hidden md:flex absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-10 size-12 lg:size-14 items-center justify-center rounded-full bg-black/55 hover:bg-black/80 text-white shadow-xl backdrop-blur-sm transition-all"
          >
            <ChevronLeft className="size-7" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => advance(1)}
            className="hidden md:flex absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-10 size-12 lg:size-14 items-center justify-center rounded-full bg-black/55 hover:bg-black/80 text-white shadow-xl backdrop-blur-sm transition-all"
          >
            <ChevronRight className="size-7" strokeWidth={2.4} />
          </button>
        </>
      )}

      {N > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 md:mt-4">
          {stories.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={
                i === index
                  ? 'h-2 w-7 rounded-full bg-rose-bright transition-all'
                  : 'h-2 w-2 rounded-full bg-white/30 hover:bg-white/60 transition-all'
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Slide({
  story,
  labels,
  userTier,
}: {
  story: Story;
  labels: Props['labels'];
  userTier?: SubscriptionTier | null;
}) {
  const hot = isStoryHot(story);
  const isLocked =
    userTier !== undefined && storyRequiresUpgrade(story, userTier);

  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] rounded-2xl md:rounded-3xl overflow-hidden bg-bg-card shadow-2xl shadow-black/60">
      <Image
        src={story.cover}
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 94vw, (max-width: 1024px) 88vw, 80vw"
        className="object-cover object-[center_25%]"
      />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 80%), linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Hero HOT badge — pill com flame + glow pulsante. Pousa no topo-direito
          do slide pra não competir com o título/sinopse à esquerda. Visual
          diferente da tarja em barra dos cards de baixo: aqui o objetivo é
          chamar atenção sem invadir a leitura. */}
      {hot && (
        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 md:top-7 md:right-7 z-10">
          <div className="relative inline-flex items-center gap-1.5 md:gap-2 h-8 md:h-9 px-3 md:px-4 rounded-full bg-gradient-to-r from-red-700 via-orange-500 to-red-700 shadow-[0_4px_18px_rgba(220,38,38,0.65)] animate-hot-glow ring-1 ring-orange-300/40">
            <FlameIcon flicker className="size-4 md:size-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            <span className="text-[11px] md:text-xs font-extrabold uppercase tracking-[0.28em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              Hot
            </span>
          </div>
        </div>
      )}

      <div className="relative h-full flex flex-col justify-end pb-5 sm:pb-7 md:pb-10 pl-5 sm:pl-7 md:pl-10 pr-5 max-w-2xl">
        <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-[0.28em] text-gold-bright mb-2 md:mb-3">
          {GENRE_LABELS[story.genre]}
        </span>

        <h1 className="font-serif italic font-black text-[26px] sm:text-3xl md:text-4xl lg:text-5xl text-white leading-[1.05] tracking-tight mb-2 md:mb-3 line-clamp-2 drop-shadow-[0_3px_14px_rgba(0,0,0,0.85)]">
          {story.title}
        </h1>

        <p className="hidden sm:block text-sm md:text-[15px] text-text-soft/95 max-w-lg line-clamp-2 mb-4 md:mb-5 leading-relaxed">
          {story.synopsis}
        </p>

        <div className="flex flex-row gap-2.5 sm:gap-3">
          {isLocked ? (
            // Premium gate: leva direto pro upgrade com returnTo pra detail.
            <Button
              asChild
              size="lg"
              className="h-11 sm:h-12 md:h-14 text-sm md:text-base px-5 md:px-7 bg-gradient-to-r from-gold-bright to-gold text-bg-deep hover:brightness-105"
            >
              <Link
                href={
                  `/account?upgrade=required&from=/s/${story.slug}` as never
                }
              >
                <Crown />
                {labels.lockedCta}
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="h-11 sm:h-12 md:h-14 text-sm md:text-base px-5 md:px-7"
            >
              <Link href={`/s/${story.slug}/watch` as never}>
                <Play className="fill-current" />
                {labels.watchNow}
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="glass"
            size="lg"
            className="h-11 sm:h-12 md:h-14 text-sm md:text-base px-5 md:px-7"
          >
            <Link href={`/s/${story.slug}` as never}>
              <Info />
              {labels.moreInfo}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
