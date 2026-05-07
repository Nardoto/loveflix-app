// Share button — exposed inside the Player top bar so users can share a
// story while watching/listening. Strategy:
//
//  1. Native Web Share API (`navigator.share`) on mobile (iOS/Android) and
//     supported desktops — opens the OS share sheet (Messages, WhatsApp,
//     Mail, AirDrop…). This is the preferred path for our 55+ female
//     audience because the share sheet is familiar and one-tap.
//  2. Fallback to clipboard (`navigator.clipboard.writeText`) on desktops
//     without Web Share — most Chrome/Firefox installs. We surface a small
//     "Copied!" confirmation so the action isn't silent.
//  3. Last-resort `window.prompt` if both APIs fail (rare: insecure
//     contexts, locked-down enterprise browsers).
//
// We share the canonical story page (`/s/[slug]`), NOT `/watch`, because
// the recipient is unauthenticated. Landing on /watch would bounce them
// straight to /login; the detail page shows cover + synopsis + the Watch
// CTA, which is a much better onboarding for the new viewer.
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Check } from 'lucide-react';
import { posthog } from '@/lib/posthog';
import { cn } from '@/lib/utils';

type ShareButtonProps = {
  /** Story slug — used to build the canonical share URL. */
  storySlug: string;
  /** Localized story title — appears in the share-sheet preview. */
  storyTitle: string;
  /** Optional className override (size/positioning tweaks). */
  className?: string;
  /** Icon-only when true (player top bar); icon + label when false. */
  compact?: boolean;
};

export function ShareButton({
  storySlug,
  storyTitle,
  className,
  compact = true,
}: ShareButtonProps) {
  const t = useTranslations('player.share');
  const [copied, setCopied] = useState(false);

  const buildUrl = (): string => {
    // utm_source=share lets us measure share-driven traffic in PostHog
    // without a custom domain shortener.
    const path = `/s/${storySlug}?utm_source=share`;
    if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
    return `https://alluretv.net${path}`;
  };

  const trackShare = (method: 'native' | 'clipboard' | 'prompt') => {
    try {
      posthog.capture('story_shared', {
        story_slug: storySlug,
        method,
      });
    } catch {
      // PostHog not initialized (no env key in dev) — silent skip.
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      trackShare('clipboard');
    } catch {
      // Insecure context / clipboard blocked. Last resort: show the URL
      // in a prompt so the user can copy it manually.
      window.prompt(t('copyManual'), url);
      trackShare('prompt');
    }
  };

  const handleShare = async () => {
    const url = buildUrl();
    const shareData: ShareData = {
      title: t('title', { title: storyTitle }),
      text: t('text'),
      url,
    };

    // canShare protects against iOS Safari throwing on payloads it dislikes
    // (e.g. some older iOS versions reject the `text` field). When canShare
    // returns false we skip native and copy instead.
    const canNativeShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));

    if (canNativeShare) {
      try {
        await navigator.share(shareData);
        trackShare('native');
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet on purpose. Don't fall
        // through to clipboard — they explicitly cancelled.
        if (err instanceof Error && err.name === 'AbortError') return;
        // Any other failure: fall through to clipboard so the action
        // still produces a useful result.
      }
    }

    await fallbackCopy(url);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t('label')}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-11 rounded-full bg-black/70 backdrop-blur text-white hover:bg-rose transition-all shrink-0 shadow-lg shadow-black/40',
        compact ? 'w-11' : 'pl-3 pr-4',
        className,
      )}
    >
      {copied ? (
        <Check className="size-5 text-rose-bright" />
      ) : (
        <Share2 className="size-5" />
      )}
      {!compact && (
        <span className="text-sm font-semibold">
          {copied ? t('copied') : t('label')}
        </span>
      )}
      {/* Icon-only mode: surface a tiny floating "Copied!" pill so the
          feedback is unmistakable for older users who might miss the
          icon swap. Disappears with the same 2.2s timer. */}
      {compact && copied && (
        <span
          role="status"
          className="absolute top-full mt-2 px-3 py-1 rounded-full bg-rose text-white text-xs font-bold shadow-lg shadow-black/40 pointer-events-none whitespace-nowrap"
        >
          {t('copied')}
        </span>
      )}
    </button>
  );
}
