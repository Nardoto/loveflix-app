import { Link } from '@/lib/navigation';
import { StoryCard } from './StoryCard';
import { FlameIcon } from '@/components/icons/FlameIcon';
import type { Story } from '@/lib/data/stories';
import type { SubscriptionTier } from '@/lib/paywall';

/**
 * HOT row — the spiciest stories with red/orange treatment instead of the
 * usual rose. Sits at the very top of the catalog to grab attention.
 */
export function HotShowcase({
  stories,
  userTier,
}: {
  stories: Story[];
  userTier?: SubscriptionTier | null;
}) {
  if (!stories.length) return null;

  return (
    <section className="relative px-4 md:px-10 mt-6 md:mt-8">
      {/* Ambient red/orange glow that frames the row without using a border */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 bottom-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_left,rgba(220,38,38,0.18),transparent_60%)]"
      />

      <div className="flex items-center justify-between gap-3 mb-2 md:mb-3">
        <h2 className="font-serif italic font-extrabold tracking-tight leading-none flex items-center gap-2.5 flex-wrap">
          <FlameIcon flicker className="size-7 md:size-8 text-orange-400" />
          <span className="text-2xl md:text-3xl lg:text-4xl bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            HOT
          </span>
          <span className="text-white text-lg md:text-xl lg:text-2xl">
            Right Now
          </span>
        </h2>
        <Link
          href="/hot"
          className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-orange-400 hover:text-orange-300 transition-colors shrink-0"
        >
          View all →
        </Link>
      </div>

      <div className="row-track flex gap-2.5 md:gap-3 overflow-x-auto -mx-4 md:-mx-10 px-4 md:px-10 snap-x snap-mandatory scroll-smooth">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} userTier={userTier} />
        ))}
      </div>
    </section>
  );
}
