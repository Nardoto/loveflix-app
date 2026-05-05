import Image from 'next/image';
import { Play, Info } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import type { Story } from '@/lib/data/stories';

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

// Single static hero. NN/g + the older-adult research are explicit:
// auto-rotating mobile carousels reduce comprehension, especially for the
// 55+ audience. We pick a single editorial title and give it room. The
// hero takes 70vh on mobile (enough for cover + title + CTA) — slightly
// shorter than the old carousel so the genre chips below appear above
// the fold and signal "there's more here".
export async function HeroFeatured({ story }: { story: Story }) {
  const t = await getTranslations('home.hero');

  return (
    <section className="relative h-[70vh] min-h-[480px] md:h-[78vh] md:min-h-[600px] w-full overflow-hidden">
      <Image
        src={story.cover}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover scale-105"
      />
      <div className="absolute inset-0 hero-overlay" />

      <div className="relative h-full flex flex-col justify-end pb-12 md:pb-24 px-5 md:px-10 lg:px-14 max-w-3xl">
        <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-gold-bright mb-3">
          {GENRE_LABELS[story.genre]}
        </span>

        <h1 className="font-serif italic font-black text-[44px] sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.02] tracking-tight mb-4 md:mb-5 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
          {story.title}
        </h1>

        <p className="text-[17px] md:text-lg text-text-soft/95 max-w-xl line-clamp-2 md:line-clamp-3 mb-6 md:mb-8 leading-relaxed">
          {story.synopsis}
        </p>

        {/* Mobile-first: full-width primary CTA at 56px tall (research:
            56×56 minimum tap target for 55+). Glass secondary alongside. */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-md sm:max-w-none">
          <Button asChild size="lg" className="h-14 text-base px-7 sm:flex-none">
            <Link href={`/s/${story.slug}/watch` as never}>
              <Play className="fill-current" />
              {t('watchNow')}
            </Link>
          </Button>
          <Button
            asChild
            variant="glass"
            size="lg"
            className="h-14 text-base px-7 sm:flex-none"
          >
            <Link href={`/s/${story.slug}` as never}>
              <Info />
              {t('moreInfo')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
