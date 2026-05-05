import Image from 'next/image';
import { Link } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import type { Story } from '@/lib/data/stories';
import { getAuthorFor, creatorName } from '@/lib/data/authors';
import { isStoryHot } from '@/lib/data/hot';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { SparkleIcon } from '@/components/icons/SparkleIcon';

const GENRE_LABELS: Record<Story['genre'], string> = {
  mafia: 'Mafia',
  billionaire: 'Billionaire',
  forbidden: 'Forbidden',
  secret_baby: 'Secret Baby',
  second_chance: 'Second Chance',
  arranged: 'Arranged',
  royal: 'Royal',
  mood: 'Mood Piece',
};

export function StoryCard({ story, rank }: { story: Story; rank?: number }) {
  const author = getAuthorFor(story);
  const hot = isStoryHot(story);
  return (
    <Link
      href={`/s/${story.slug}` as never}
      className="card-hover group relative shrink-0 w-[180px] sm:w-[230px] lg:w-[300px] xl:w-[320px] snap-start rounded-xl overflow-hidden bg-bg-card shadow-lg shadow-black/40"
    >
      <div className="relative aspect-video">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          sizes="(max-width: 768px) 220px, (max-width: 1024px) 280px, 320px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
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
          {story.isComingSoon && <Badge variant="comingSoon">Soon</Badge>}
        </div>

        {/* Creator tag — each channel gets its own signature cursive font
            (see app/[locale]/layout.tsx + lib/data/authors.ts) so you can spot
            them at a glance without relying on similar-looking avatars. */}
        <span
          className="absolute top-2 right-2 inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur shadow-md shadow-black/40"
          title={author.name}
          aria-label={`Story by ${author.name}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-text-mute leading-none">
            By
          </span>
          <span
            className="text-lg md:text-xl text-gold-bright leading-none translate-y-[1px]"
            style={{ fontFamily: author.font }}
          >
            {creatorName(author)}
          </span>
        </span>

        {/* Top-10 rank badge */}
        {rank !== undefined && (
          <div className="absolute top-0 left-0 font-serif font-black italic text-[5rem] leading-none text-rose/80 select-none -translate-y-1 -translate-x-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]">
            {rank}
          </div>
        )}

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-bright/90">
            {GENRE_LABELS[story.genre]}
          </span>
          <h3 className="font-serif text-sm md:text-base font-bold italic text-white leading-tight line-clamp-2">
            {story.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
            {story.totalMinutes && <span>{story.totalMinutes} min</span>}
            {story.ageRating && (
              <>
                <span className="opacity-50">·</span>
                <span className="text-gold">{story.ageRating}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
