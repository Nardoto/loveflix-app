import Image from 'next/image';
import { Link } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import type { Story } from '@/lib/data/stories';
import { getAuthorFor, creatorName } from '@/lib/data/authors';
import { isStoryHot } from '@/lib/data/hot';
import { SparkleIcon } from '@/components/icons/SparkleIcon';
import { FlameIcon } from '@/components/icons/FlameIcon';

// Catalog card. Big covers (Disney+/Audible-style), title + creator
// below. Two cover badges — FREE and HOT — because both are real
// conversion signals: "Free to listen" pulls cold visitors in, and the
// glowing HOT badge tells regulars this is the spicy hit of the week.
// No creator/duration/age-rating/language on the cover itself; that all
// stays on the detail page so the cover reads at a glance.

export function StoryCard({ story }: { story: Story }) {
  const author = getAuthorFor(story);
  const hot = isStoryHot(story);

  return (
    <Link
      href={`/s/${story.slug}` as never}
      className="group shrink-0 w-56 sm:w-64 lg:w-80 snap-start active:opacity-90 transition-opacity"
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-bg-card shadow-lg shadow-black/40 ring-1 ring-white/5">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          sizes="(max-width: 640px) 224px, (max-width: 1024px) 256px, 320px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Bottom dim so when the cover happens to be very bright the
            ring/shadow still reads. Subtle — no overlay text. */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Top-left badge stack — FREE (green) and/or HOT (glowing red).
            Stacked vertically with a tight gap so they read clearly on
            even the smallest 16:9 thumbnail. ComingSoon takes over when
            present (preempts the others). */}
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

      <div className="mt-2.5 px-0.5">
        <h3 className="font-serif italic text-[15px] sm:text-base font-semibold text-white leading-snug line-clamp-2 min-h-[2.5em]">
          {story.title}
        </h3>
        <p className="mt-1 text-xs text-text-dim leading-tight flex items-baseline gap-1">
          <span className="opacity-70">by</span>
          <span
            className="text-gold-bright text-base translate-y-[1px]"
            style={{ fontFamily: author.font }}
          >
            {creatorName(author)}
          </span>
        </p>
      </div>
    </Link>
  );
}
