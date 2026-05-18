'use client';

// Prime Video-style floating hover card. Mounted via React portal directly
// on document.body so it escapes any `overflow-hidden` ancestor (Row,
// sections etc). Positioned relative to the anchor card's bounding rect at
// open time and clamped to the viewport edges.
//
// Desktop only — the parent StoryCard guards `hover: hover` via matchMedia
// before rendering this. Mobile keeps the bare Link → /s/{slug} flow.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Play, Plus, Check, Info, Loader2, Clock3, Crown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { SparkleIcon } from '@/components/icons/SparkleIcon';
import { isStoryHot } from '@/lib/data/hot';
import type { Story } from '@/lib/data/stories';
import type { SubscriptionTier } from '@/lib/paywall';
import { storyRequiresUpgrade } from '@/lib/paywall';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';

type Props = {
  story: Story;
  userTier?: SubscriptionTier | null;
  anchor: DOMRect;
  initialFavorite: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const HC_WIDTH = 460;
const HC_VIEWPORT_PAD = 16;

export function HoverCard({
  story,
  userTier,
  anchor,
  initialFavorite,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const t = useTranslations('home');
  const tHero = useTranslations('home.hero');
  const tPaywall = useTranslations('paywall');
  const tMyList = useTranslations('myList');

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isFav, setIsFav] = useState(initialFavorite);
  const [pendingFav, setPendingFav] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Defer one frame so the initial opacity-0/scale-95 paints before the
    // transition target — guarantees the fade-in animation runs.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;

  const hot = isStoryHot(story);
  const audioLocales = Object.keys(
    story.audioKeyByLocale ?? story.audioByLocale ?? {},
  );
  const showPremium =
    userTier !== undefined && storyRequiresUpgrade(story, userTier);

  // Position the card centered horizontally over the anchor, slightly above
  // so the cover sits where the original card was. Clamp to viewport edges.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const anchorCenterX = anchor.left + anchor.width / 2;
  let left = anchorCenterX - HC_WIDTH / 2;
  left = Math.max(HC_VIEWPORT_PAD, Math.min(left, vw - HC_WIDTH - HC_VIEWPORT_PAD));

  // Estimate card height: cover area (aspect-video 16/9) + info area (~210px).
  const coverH = (HC_WIDTH * 9) / 16;
  const estimatedHeight = coverH + 220;
  // Try to keep the card centered on the anchor vertically; fall back to
  // pushing above/below if it would clip.
  let top = anchor.top + anchor.height / 2 - estimatedHeight / 2;
  top = Math.max(HC_VIEWPORT_PAD, Math.min(top, vh - estimatedHeight - HC_VIEWPORT_PAD));

  const toggleFav = async () => {
    if (pendingFav) return;
    const next = !isFav;
    setIsFav(next);
    setPendingFav(true);
    try {
      const res = next
        ? await addFavorite(story.slug)
        : await removeFavorite(story.slug);
      if (!res.ok) {
        setIsFav(!next);
        if (res.error === 'Não autenticado') {
          window.location.href = `/login?returnTo=${encodeURIComponent(
            `/s/${story.slug}`,
          )}`;
        }
      }
    } finally {
      setPendingFav(false);
    }
  };

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-label={story.title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'fixed z-50 pointer-events-auto',
        'rounded-2xl overflow-hidden',
        'bg-bg-elevated text-white',
        'shadow-2xl shadow-black/70 ring-1 ring-white/15',
        'transition-all duration-200 ease-out',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
      ].join(' ')}
      style={{
        left,
        top,
        width: HC_WIDTH,
      }}
    >
      <div className="relative aspect-video bg-bg-card">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          sizes="460px"
          className={`object-cover object-[center_28%] ${
            story.isComingSoon ? 'grayscale-[0.55] brightness-[0.55]' : ''
          }`}
          priority
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-elevated via-bg-elevated/60 to-transparent pointer-events-none" />

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

        {!story.isComingSoon && story.isFree && (
          <div className={`absolute left-2 ${hot ? 'top-10' : 'top-2'}`}>
            <Badge variant="free">
              <SparkleIcon className="size-3" />
              Free
            </Badge>
          </div>
        )}
        {showPremium && (
          <div className={`absolute right-2 ${hot ? 'top-10' : 'top-2'}`}>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-gold-bright to-gold text-bg-deep text-[10px] font-extrabold uppercase tracking-wider shadow-[0_2px_8px_rgba(212,175,111,0.45)]">
              <Crown className="size-3" />
              {tPaywall('badge')}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <h3 className="font-serif italic text-lg font-bold leading-tight line-clamp-2">
          {story.title}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim">
          {story.ageRating && <span>{story.ageRating}</span>}
          {story.totalMinutes && story.totalMinutes > 0 && (
            <>
              <span className="text-text-mute">·</span>
              <span>{story.totalMinutes} min</span>
            </>
          )}
          {audioLocales.length > 0 && (
            <>
              <span className="text-text-mute">·</span>
              <span>{audioLocales.map((l) => l.toUpperCase()).join(' · ')}</span>
            </>
          )}
        </div>

        {story.synopsis && (
          <p className="mt-2.5 text-sm text-text-soft leading-relaxed line-clamp-3">
            {story.synopsis}
          </p>
        )}

        {story.tropes && story.tropes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {story.tropes.slice(0, 4).map((trope) => (
              <span
                key={trope}
                className="px-2 py-0.5 rounded-md bg-white/8 text-[10px] font-semibold uppercase tracking-wider text-text-dim"
              >
                {trope}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          <Link
            href={`/s/${story.slug}` as never}
            className="flex-1 h-11 rounded-xl bg-white text-bg-deep font-bold inline-flex items-center justify-center gap-2 hover:bg-zinc-100 active:scale-[0.98] transition-all text-sm"
          >
            <Play className="size-4 fill-current" />
            <span>{tHero('watchNow')}</span>
          </Link>

          <button
            type="button"
            onClick={toggleFav}
            disabled={pendingFav}
            aria-label={isFav ? tMyList('removeAria') : tMyList('addAria')}
            className={[
              'size-11 rounded-xl grid place-items-center transition-all active:scale-[0.96]',
              isFav
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/25'
                : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20',
              pendingFav ? 'cursor-wait' : 'cursor-pointer',
            ].join(' ')}
          >
            {pendingFav ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isFav ? (
              <Check className="size-5" strokeWidth={2.5} />
            ) : (
              <Plus className="size-5" strokeWidth={2.5} />
            )}
          </button>

          <Link
            href={`/s/${story.slug}` as never}
            aria-label={tHero('moreInfo')}
            className="size-11 rounded-xl grid place-items-center bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition-all active:scale-[0.96]"
          >
            <Info className="size-5" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
