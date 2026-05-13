'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useMediaToken, mediaUrl } from '@/lib/hooks/useMediaToken';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  ChevronLeft,
  Settings,
  Moon,
  BookOpen,
  Headphones,
  Film,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import type { Story } from '@/lib/data/stories';
import { cn } from '@/lib/utils';
import { ShareButton } from './ShareButton';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

const formatTime = (s: number): string => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

type Mode = 'video' | 'audio';

export function Player({
  story,
  initialMode = 'audio',
  initialLocale,
}: {
  story: Story;
  initialMode?: Mode;
  initialLocale: string;
}) {
  const router = useRouter();
  const tErr = useTranslations('player.errors');
  const tCommon = useTranslations('common');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Passa o slug pro endpoint — quando a story é `is_free=true`, o server
  // assina um token scoped (tier=active + keyPrefix='stories/<slug>/') que
  // libera o playback mesmo pra anônimos. Pra stories pagas, o slug não
  // afeta o token retornado.
  const { token, tier, loading: tokenLoading, error: tokenError } =
    useMediaToken(story.slug);

  const hasVideo = !!(story.videoSrc || story.videoKey);
  const hasAudio = !!(story.audioByLocale || story.audioKeyByLocale);
  const hasEbook = !!story.hasEbook;

  const [mode, setMode] = useState<Mode>(
    !hasVideo ? 'audio' : initialMode,
  );
  const [audioLocale, setAudioLocale] = useState<string>(() => {
    const map = story.audioKeyByLocale ?? story.audioByLocale;
    if (map && map[initialLocale]) return initialLocale;
    return map ? Object.keys(map)[0] : initialLocale;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  // True until the active media has fired `canplay`. We show a fake loading
  // overlay during this window — and to give the audience the perception of an
  // instant start we also show it for at least 600ms after mount even when the
  // network is fast.
  const [loading, setLoading] = useState(true);
  // Surfaced when the <video>/<audio> element fires `error` — typically a
  // 401/402 from the Worker (token missing or tier=free for premium content).
  // Without this the spinner stays forever and the user has no idea why.
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeMedia = mode === 'video' ? videoRef.current : audioRef.current;

  // Lock body scroll while the player is mounted — prevents the underlying
  // page from showing a phantom scrollbar behind the fixed-overlay player.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // (Autoplay + error effects moved below URL resolution so they can depend
  //  on the resolved src strings — see end of this hook block.)

  // Hide controls on inactivity
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const reset = () => {
      setShowControls(true);
      clearTimeout(id);
      if (isPlaying) id = setTimeout(() => setShowControls(false), 4000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
    };
  }, [isPlaying]);

  // Apply speed/volume/mute to whichever media is active
  useEffect(() => {
    if (!activeMedia) return;
    activeMedia.playbackRate = speed;
    activeMedia.volume = volume;
    activeMedia.muted = muted;
  }, [activeMedia, speed, volume, muted]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepMinutes === 0) {
      setSleepRemaining(0);
      return;
    }
    setSleepRemaining(sleepMinutes * 60);
    const id = setInterval(() => {
      setSleepRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          activeMedia?.pause();
          setIsPlaying(false);
          setSleepMinutes(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sleepMinutes, activeMedia]);

  // Switch modes seamlessly — like turning the screen off, audio keeps playing.
  // We pre-sync `currentTime` on the target element BEFORE swapping the active
  // mode so the user doesn't hear a gap. The current element is paused after
  // the new one is already running.
  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    const prev = activeMedia;
    const currentTime = prev?.currentTime ?? 0;
    const wasPlaying = !!prev && !prev.paused;
    const next = newMode === 'video' ? videoRef.current : audioRef.current;

    if (next) {
      try {
        next.currentTime = currentTime;
      } catch {
        // Some browsers throw if the new media's metadata isn't loaded yet —
        // the autoplay effect below will catch up once `canplay` fires.
      }
      if (wasPlaying) {
        next.play().catch(() => {});
      }
    }
    setMode(newMode);
    if (prev && prev !== next) prev.pause();
  };

  const switchLocale = (newLocale: string) => {
    const map = story.audioKeyByLocale ?? story.audioByLocale;
    if (!map || newLocale === audioLocale) return;
    const currentTime = audioRef.current?.currentTime ?? 0;
    const wasPlaying = !audioRef.current?.paused;
    setAudioLocale(newLocale);
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = currentTime;
        if (wasPlaying) audio.play().catch(() => {});
      }
    }, 100);
  };

  const togglePlay = useCallback(() => {
    if (!activeMedia) return;
    if (activeMedia.paused) {
      activeMedia.play();
      setIsPlaying(true);
    } else {
      activeMedia.pause();
      setIsPlaying(false);
    }
  }, [activeMedia]);

  const onTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setTime(e.currentTarget.currentTime);
  };
  const onLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const seekBy = (seconds: number) => {
    if (!activeMedia) return;
    activeMedia.currentTime = Math.max(0, Math.min(activeMedia.currentTime + seconds, duration));
  };

  const fullscreen = () => {
    const el = mode === 'video' ? videoRef.current : document.documentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') seekBy(-10);
      else if (e.code === 'ArrowRight') seekBy(10);
      else if (e.code === 'KeyM') setMuted((m) => !m);
      else if (e.code === 'KeyF') fullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, duration]);

  // Resolve playback URLs. R2 keys go through the Worker (with token); local
  // mock URLs (videoSrc/audioByLocale) bypass the gate entirely.
  //
  // CRITICAL: when the asset is on R2 we MUST wait for the token before setting
  // src. Setting src=<url-without-token> fires a 401 immediately, the element
  // enters error state, and `canplay` never fires — the spinner gets stuck
  // forever. Returning undefined keeps the <video src> attribute absent until
  // we have a token to attach.
  const videoSrcResolved = useMemo(() => {
    if (story.videoKey) return token ? mediaUrl(story.videoKey, token) : undefined;
    return story.videoSrc;
  }, [story.videoKey, story.videoSrc, token]);
  const audioSrc = useMemo(() => {
    const key = story.audioKeyByLocale?.[audioLocale];
    if (key) return token ? mediaUrl(key, token) : undefined;
    return story.audioByLocale?.[audioLocale];
  }, [story.audioKeyByLocale, story.audioByLocale, audioLocale, token]);

  // Autoplay every time the active media src changes (mode swap, locale swap,
  // OR token arriving and adding ?token= to the URL for the first time). The
  // Watch button is the user gesture that authorizes autoplay with sound, so
  // browsers honor it. If autoplay does get blocked (old Safari), the loading
  // overlay turns into a Tap-to-play prompt because we setIsPlaying(false)
  // after the failed promise.
  //
  // We depend on the resolved src strings (not the ref) so the effect re-runs
  // when token finally arrives and rewrites the URL. Otherwise canplay would
  // be listened for once, miss the new src's load cycle, and we'd be stuck.
  const activeSrc = mode === 'video' ? videoSrcResolved : audioSrc;
  useEffect(() => {
    const m = activeMedia;
    if (!m || !activeSrc) return;
    setMediaError(null);
    setLoading(true);
    const minLoadingTimer = setTimeout(() => {
      if (m.readyState >= 3) setLoading(false);
    }, 600);
    const onCanPlay = () => {
      setLoading(false);
      m.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };
    if (m.readyState >= 3) onCanPlay();
    else m.addEventListener('canplay', onCanPlay);
    return () => {
      clearTimeout(minLoadingTimer);
      m.removeEventListener('canplay', onCanPlay);
    };
  }, [activeMedia, activeSrc]);

  // Translate the media element's `error` event into a human message. Without
  // this the spinner stays up forever when the Worker rejects the request
  // (missing token, expired token, free tier hitting a paid asset).
  const onMediaError = useCallback(() => {
    setLoading(false);
    if (tier === 'free' && (story.videoKey || story.audioKeyByLocale)) {
      setMediaError(tErr('subscriberOnly'));
    } else if (tokenError) {
      setMediaError(tErr('auth'));
    } else {
      setMediaError(tErr('generic'));
    }
  }, [tier, tokenError, story.videoKey, story.audioKeyByLocale, tErr]);

  // ============================================================
  // MediaSession — lock screen / Bluetooth / background audio
  // ============================================================
  // Without this block: iOS Safari (PWA) pauses the audio ~30s after the
  // screen locks, Android shows a generic "Chrome" notification with no
  // cover, and Bluetooth headset / car / smartwatch buttons do nothing.
  // With it: the OS treats us as a real audio app — cover + title in the
  // lock screen, scrubber works there, and iOS keeps the session alive.

  // Metadata: re-runs when the story or audio language changes. Wrapped in
  // try/catch because some embedded WebViews throw on the MediaMetadata
  // constructor even when navigator.mediaSession is defined.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: story.title,
        artist: `Audiobook · ${audioLocale.toUpperCase()}`,
        album: 'AllureTV — Romance Audiobooks',
        artwork: [
          { src: story.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: story.cover, sizes: '192x192', type: 'image/jpeg' },
          { src: story.cover, sizes: '384x384', type: 'image/jpeg' },
          { src: story.cover, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch {
      // Defensive — older Edge / WebViews.
    }
  }, [story.id, story.title, story.cover, audioLocale]);

  // Action handlers. We re-read refs inside each callback (instead of
  // closing over `activeMedia`) so seeks always operate on whichever
  // element is currently active, even right after switchMode swaps them.
  // Each setActionHandler is guarded because Safari throws on actions it
  // doesn't recognise (e.g. seekto on older versions) and one throw would
  // skip all the handlers that come after.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported on this UA — skip silently.
      }
    };
    const getMedia = () =>
      (mode === 'video' ? videoRef.current : audioRef.current);
    set('play', () => {
      const m = getMedia();
      m?.play().catch(() => {});
      setIsPlaying(true);
    });
    set('pause', () => {
      getMedia()?.pause();
      setIsPlaying(false);
    });
    set('seekbackward', (details) => {
      const m = getMedia();
      if (!m) return;
      const offset = details.seekOffset ?? 10;
      m.currentTime = Math.max(0, m.currentTime - offset);
    });
    set('seekforward', (details) => {
      const m = getMedia();
      if (!m) return;
      const offset = details.seekOffset ?? 10;
      const max = isFinite(m.duration) ? m.duration : m.currentTime + offset;
      m.currentTime = Math.min(max, m.currentTime + offset);
    });
    set('seekto', (details) => {
      const m = getMedia();
      if (!m || details.seekTime == null) return;
      m.currentTime = details.seekTime;
      setTime(details.seekTime);
    });
    set('stop', () => {
      getMedia()?.pause();
      setIsPlaying(false);
    });
    return () => {
      set('play', null);
      set('pause', null);
      set('seekbackward', null);
      set('seekforward', null);
      set('seekto', null);
      set('stop', null);
    };
  }, [mode]);

  // Mirror our internal play/pause flag into the OS UI so the lock-screen
  // button matches reality (otherwise it can show "play" while audio plays).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Position state — drives the scrubber on the lock screen. Guarded
  // against the brief window before loadedmetadata where duration is NaN
  // or Infinity (Chrome throws on that and silently disables the scrubber
  // for the rest of the session).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;
    if (!isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(Math.max(0, time), duration),
        playbackRate: speed,
      });
    } catch {
      // Inconsistent state — next tick will correct it.
    }
  }, [duration, speed, time]);

  // Clear the OS session when the player unmounts so the user doesn't see
  // a phantom "AllureTV — paused" notification after closing the player.
  useEffect(() => {
    return () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      if (typeof navigator.mediaSession.setPositionState === 'function') {
        try {
          navigator.mediaSession.setPositionState();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Click-to-toggle layer covers media area only (excludes controls + top bar).
          bottom-48 keeps clear of the taller mobile control stack. */}
      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={togglePlay}
        className="absolute inset-x-0 top-20 bottom-48 z-0 cursor-pointer"
      />

      {/* Hidden media elements — we keep both and toggle visibility/active.
          Note: we leave src absent (not empty string) until token arrives, to
          avoid a guaranteed 401 on the first paint that puts the element in
          a permanent error state. */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={videoSrcResolved}
          // Shown until canplay fires. Without it the user sees a black
          // rectangle during the moov-atom fetch — perceived as "the app is
          // frozen". The cover image is already on the CDN from the detail
          // page, so it lands instantly.
          poster={story.cover}
          className={cn(
            'absolute inset-0 w-full h-full object-contain',
            mode !== 'video' && 'invisible',
          )}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={onMediaError}
          playsInline
          // Metadata only until user hits play. Browsers default varies (some
          // start downloading body); pinning to metadata makes egress
          // predictable and the catalog → player handoff snappy.
          preload="metadata"
        />
      )}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={onMediaError}
          // metadata, not auto: just pulls duration/seek table on mount; the
          // body streams in once the user hits play. Saves dozens of MB of
          // R2 egress for users who open the player but bounce.
          preload="metadata"
        />
      )}

      {/* Loading veil — only while we're actually waiting (token still
          fetching OR media still buffering AND no error yet). */}
      {(loading || tokenLoading) && !mediaError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
          <div className="size-14 rounded-full border-4 border-white/15 border-t-rose animate-spin" />
        </div>
      )}

      {/* Error overlay — replaces the spinner when the media element fails to
          load. Gives the user a way out instead of a forever-spinner. */}
      {mediaError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6">
          <div className="max-w-md text-center">
            <div className="text-2xl font-serif italic font-bold text-white mb-3">
              {tErr('title')}
            </div>
            <p className="text-text-soft mb-5">{mediaError}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {tier === 'free' && (
                <Button asChild variant="rose">
                  <Link href="/account">{tErr('viewPlans')}</Link>
                </Button>
              )}
              <Button
                variant="glass"
                onClick={() => {
                  setMediaError(null);
                  setLoading(true);
                  activeMedia?.load();
                }}
              >
                {tCommon('retry')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.back()}
              >
                {tCommon('back')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audiobook mode visual: pulsing cover + title */}
      {mode === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div
            className={cn(
              'relative w-[260px] sm:w-[320px] md:w-[380px] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/70',
              isPlaying && 'animate-pulse-glow',
            )}
          >
            <Image
              src={story.cover}
              alt={story.title}
              fill
              priority
              sizes="380px"
              className="object-cover"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-mute mt-8">
            Audiobook · narrated in {audioLocale.toUpperCase()}
          </div>
          <h2 className="font-serif italic text-2xl md:text-3xl font-bold text-white mt-3 max-w-md leading-tight">
            {story.title}
          </h2>
          {sleepRemaining > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-gold-bright bg-gold/15 rounded-full px-4 py-1.5">
              <Moon className="size-4" />
              Sleep in {formatTime(sleepRemaining)}
            </div>
          )}
        </div>
      )}

      {/* Top bar — ALWAYS visible (back button must be obvious) */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 md:p-4 flex items-center gap-3 bg-gradient-to-b from-black/95 via-black/70 to-transparent pointer-events-auto">
        <Link
          href={`/s/${story.slug}` as never}
          onClick={() => activeMedia?.pause()}
          className="inline-flex items-center gap-2 h-11 pl-2 pr-4 rounded-full bg-black/70 backdrop-blur text-white hover:bg-rose transition-all shrink-0 shadow-lg shadow-black/40"
        >
          <ChevronLeft className="size-5" />
          <span className="text-sm font-semibold">Back</span>
        </Link>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-bright">
            {mode === 'video' ? 'Video' : 'Audiobook'} · {audioLocale.toUpperCase()}
          </span>
          <span className="font-serif italic text-sm md:text-base text-white truncate max-w-[60vw]">
            {story.title}
          </span>
        </div>
        {/* Share — opens native share sheet on mobile, falls back to
            clipboard on desktop. Right-aligned so the title stays the
            visual focus and the back button stays in the same spot. */}
        <ShareButton
          storySlug={story.slug}
          storyTitle={story.title}
          className="relative"
        />
      </div>

      {/* Controls overlay (bottom — fades on inactivity) */}
      <div
        className={cn(
          'absolute inset-0 z-20 transition-opacity duration-300 pointer-events-none',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >

        {/* Bottom controls — mobile-first stacked rows.
            Row 1: scrubber. Row 2: primary playback (skip / play / skip).
            Row 3: secondary (mode toggle + lang + speed + sleep + extras).
            Stops click propagation so taps on controls don't trigger the
            click-to-toggle play overlay behind. */}
        <div
          className="absolute bottom-0 inset-x-0 px-3 md:px-8 pt-3 md:pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrubber */}
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span className="text-[11px] md:text-xs text-text-dim tabular-nums w-10 md:w-12 text-right shrink-0">
              {formatTime(time)}
            </span>
            <Slider
              value={[time]}
              max={duration || 100}
              step={1}
              onValueChange={([v]) => {
                if (activeMedia) activeMedia.currentTime = v;
                setTime(v);
              }}
              className="flex-1"
            />
            <span className="text-[11px] md:text-xs text-text-dim tabular-nums w-10 md:w-12 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Primary playback row — centered on mobile, left-aligned on desktop */}
          <div className="flex items-center justify-center md:justify-start gap-2 md:gap-1 mb-3 md:mb-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => seekBy(-10)}
              aria-label="Skip back 10s"
              className="size-11"
            >
              <SkipBack />
            </Button>
            <Button
              variant="rose"
              size="icon"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="size-14 md:size-14 [&_svg]:size-7 mx-1"
            >
              {isPlaying ? (
                <Pause className="fill-current" />
              ) : (
                <Play className="fill-current" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => seekBy(10)}
              aria-label="Skip forward 10s"
              className="size-11"
            >
              <SkipForward />
            </Button>
            <div className="ml-1 hidden sm:flex items-center group/vol">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMuted((m) => !m)}
                aria-label="Toggle mute"
              >
                {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
              </Button>
              <div className="w-0 group-hover/vol:w-24 focus-within:w-24 overflow-hidden transition-[width] duration-200 ease-out">
                <Slider
                  value={[muted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  aria-label="Volume"
                  onValueChange={([v]) => {
                    setVolume(v);
                    if (v > 0 && muted) setMuted(false);
                    if (v === 0) setMuted(true);
                  }}
                  className="w-20 mx-2"
                />
              </div>
            </div>
          </div>

          {/* Secondary row — mode toggle + dropdowns. Single row on desktop
              (right-aligned alongside primary controls); separate row on
              mobile, scrolls horizontally if needed instead of wrapping. */}
          <div className="md:absolute md:right-8 md:bottom-6 flex items-center gap-1.5 overflow-x-auto md:overflow-visible -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:justify-end md:max-w-[60%] no-scrollbar">
            {/* Mode toggle — Video / Audio / Read */}
            <div className="inline-flex items-center bg-white/10 rounded-full p-1 shrink-0">
              {hasVideo && (
                <button
                  onClick={() => switchMode('video')}
                  className={cn(
                    'px-3 h-8 md:h-9 rounded-full text-[11px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all',
                    mode === 'video'
                      ? 'bg-rose text-white shadow shadow-rose/40'
                      : 'text-text-dim hover:text-white',
                  )}
                >
                  <Film className="size-3.5" /> Video
                </button>
              )}
              {hasAudio && (
                <button
                  onClick={() => switchMode('audio')}
                  className={cn(
                    'px-3 h-8 md:h-9 rounded-full text-[11px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all',
                    mode === 'audio'
                      ? 'bg-rose text-white shadow shadow-rose/40'
                      : 'text-text-dim hover:text-white',
                  )}
                >
                  <Headphones className="size-3.5" /> Audio
                </button>
              )}
              {hasEbook && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 md:h-9 px-3 text-[11px] md:text-xs gap-1.5"
                >
                  <Link href={`/s/${story.slug}/read` as never}>
                    <BookOpen className="size-3.5" />
                    Read
                  </Link>
                </Button>
              )}
            </div>

            {hasAudio && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="sm" className="shrink-0 h-9">
                    🌐 {audioLocale.toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                  <DropdownMenuLabel>Audio language</DropdownMenuLabel>
                  {Object.keys(
                    story.audioKeyByLocale ?? story.audioByLocale ?? {},
                  ).map((code) => (
                    <DropdownMenuCheckboxItem
                      key={code}
                      checked={code === audioLocale}
                      onCheckedChange={() => switchLocale(code)}
                    >
                      {code === 'en' && '🇺🇸 English'}
                      {code === 'de' && '🇩🇪 Deutsch'}
                      {code === 'fr' && '🇫🇷 Français'}
                      {code === 'es' && '🇪🇸 Español'}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="shrink-0 h-9">
                  {speed}×
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                {SPEED_OPTIONS.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={s === speed}
                    onCheckedChange={() => setSpeed(s)}
                  >
                    {s}×{' '}
                    {s === 1 && (
                      <span className="ml-auto text-xs text-text-mute">
                        normal
                      </span>
                    )}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="glass"
                  size="sm"
                  aria-label="Sleep timer"
                  className="shrink-0 h-9"
                >
                  <Moon className="size-4" />
                  {sleepMinutes > 0 && (
                    <span className="ml-1 text-rose-bright">{sleepMinutes}m</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel>Sleep timer</DropdownMenuLabel>
                {SLEEP_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.minutes}
                    checked={opt.minutes === sleepMinutes}
                    onCheckedChange={() => setSleepMinutes(opt.minutes)}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={fullscreen}
              aria-label="Fullscreen"
              className="shrink-0 h-9 w-9"
            >
              <Maximize />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
