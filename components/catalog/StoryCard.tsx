import Image from 'next/image';
import { Link } from '@/lib/navigation';
import type { Story } from '@/lib/data/stories';
import { getAuthorFor, creatorName } from '@/lib/data/authors';
import { SparkleIcon } from '@/components/icons/SparkleIcon';

// Catalog card. Disney+/Audible-style: clean cover image (no overlays),
// metadata BELOW. Audience is 55+, so titles are 17px/600 with generous
// vertical room. The only overlay is a single small "FREE" pill — kept
// because "free to listen" is a key conversion signal for our acquisition
// flow. No HOT/creator/duration on the cover itself; that all moves to
// the detail page or to the row title (e.g. the "Hot Right Now" row).

export function StoryCard({ story }: { story: Story }) {
  const author = getAuthorFor(story);

  return (
    <Link
      href={`/s/${story.slug}` as never}
      className="group shrink-0 w-40 sm:w-44 lg:w-56 snap-start active:opacity-90 transition-opacity"
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-bg-card shadow-lg shadow-black/40 ring-1 ring-white/5">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 224px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Bottom dim so when the cover happens to be very bright the
            ring/shadow still reads. Subtle — no overlay text. */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {story.isFree && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-deep/85 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-green-allure shadow shadow-black/40">
            <SparkleIcon className="size-3" />
            Free
          </span>
        )}

        {story.isComingSoon && (
          <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full bg-bg-deep/85 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-text-dim shadow shadow-black/40">
            Soon
          </span>
        )}
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
