import Image from 'next/image';
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
          className="object-cover object-[center_28%] transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Subtle bottom dim — keeps badges legible on bright covers
            without painting over the artwork. */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {/* Top-left badge stack — FREE / HOT / Soon. */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {story.isComingSoon ? (
            <Badge variant="comingSoon">Soon</Badge>
          ) : (
            <>
              {story.isFree && (
                <Badge variant="free">
                  <SparkleIcon className="size-3" />
                  Free
                </Badge>
              )}
              {hot && (
                <Badge variant="hot">
                  <FlameIcon className="size-3" />
                  Hot
                </Badge>
              )}
            </>
          )}
        </div>
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
