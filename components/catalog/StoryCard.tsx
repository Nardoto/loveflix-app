'use client';

import Image from 'next/image';
import { Clock3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import type { Story } from '@/lib/data/stories';
import { getAuthorFor, creatorName } from '@/lib/data/authors';
import { isStoryHot } from '@/lib/data/hot';
import { SparkleIcon } from '@/components/icons/SparkleIcon';
import { FlameIcon } from '@/components/icons/FlameIcon';

// Disney+ "Continue Assistindo" style — big landscape cover, title and
// meta sit BELOW so the artwork breathes. Cover is the primary identifier
// (faces + setting communicate genre at a glance); the title is a small
// confirmation label, not a billboard.
//
// Sizing is tuned for the 55+ audience: mobile cards are ~80vw so a
// single cover dominates the viewport (no more "embolada" feeling), with
// a peek of the next card hinting that the row scrolls. Desktop scales up
// to ~420px so 3-4 cards stay visible on a 1440px screen.

export function StoryCard({ story }: { story: Story }) {
  const t = useTranslations('home');
  const author = getAuthorFor(story);
  const hot = isStoryHot(story);
  const audioLocales = Object.keys(
    story.audioKeyByLocale ?? story.audioByLocale ?? {},
  );

  return (
    <Link
      href={`/s/${story.slug}` as never}
      className="group shrink-0 w-[80vw] max-w-[360px] sm:w-[58vw] sm:max-w-[420px] md:w-[44vw] md:max-w-[420px] lg:w-[400px] xl:w-[420px] snap-start active:opacity-90 transition-opacity"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-bg-card shadow-lg shadow-black/50 ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          sizes="(max-width: 640px) 360px, (max-width: 1024px) 420px, 420px"
          className={`object-cover object-[center_28%] transition-transform duration-500 group-hover:scale-[1.04] ${
            story.isComingSoon ? 'grayscale-[0.55] brightness-[0.55]' : ''
          }`}
        />

        {/* Subtle bottom dim — keeps badges legible on bright covers
            without painting over the artwork. */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {/* TARJA — full-width strip across the top. Reads at-a-glance:
            HOT (red/orange) or COMING SOON (dark muted). Mutually exclusive
            with each other; FREE stays as a small corner pill below. */}
        {story.isComingSoon ? (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 to-black/55 backdrop-blur-[2px] border-b border-white/15 px-3 py-1.5 flex items-center justify-center gap-2">
            <Clock3 className="size-3.5 text-amber-300" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white">
              {t('comingSoon')}
            </span>
          </div>
        ) : hot ? (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-red-700 via-orange-500 to-red-700 px-3 py-1.5 flex items-center justify-center gap-2 shadow-[0_3px_14px_rgba(220,38,38,0.55)] animate-hot-glow">
            <FlameIcon flicker className="size-3.5 text-white" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
              HOT
            </span>
          </div>
        ) : null}

        {/* FREE pill — only shown when not coming-soon (free + soon doesn't
            make sense — there's nothing to listen to yet). Pulled below the
            tarja so it doesn't fight for the same space. */}
        {!story.isComingSoon && story.isFree && (
          <div className={`absolute left-2 ${hot ? 'top-10' : 'top-2'}`}>
            <Badge variant="free">
              <SparkleIcon className="size-3" />
              Free
            </Badge>
          </div>
        )}
      </div>

      {/* Title below the cover — kept small (14-15px) so the artwork
          stays the hero. Two-line clamp + min-h so card heights align
          across the row and short titles don't make holes. */}
      <div className="mt-2.5 px-0.5">
        <h3 className="font-serif italic text-[14px] md:text-[15px] font-semibold text-white leading-snug line-clamp-2 min-h-[2.4em]">
          {story.title}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-text-dim leading-none flex items-baseline gap-1 truncate min-w-0">
            <span className="opacity-70">by</span>
            <span
              className="text-gold-bright text-[14px] translate-y-[1px] truncate"
              style={{ fontFamily: author.font }}
            >
              {creatorName(author)}
            </span>
          </p>
          {audioLocales.length > 0 && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-mute shrink-0">
              {audioLocales.map((l) => l.toUpperCase()).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
