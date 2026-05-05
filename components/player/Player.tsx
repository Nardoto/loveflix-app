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
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { token } = useMediaToken();

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

  const activeMedia = mode === 'video' ? videoRef.current : audioRef.current;

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

  // Sync state when switching modes — keep playback position
  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    const currentTime = activeMedia?.currentTime ?? 0;
    activeMedia?.pause();
    setMode(newMode);
    setTimeout(() => {
      const next = newMode === 'video' ? videoRef.current : audioRef.current;
      if (next) {
        next.currentTime = currentTime;
        if (isPlaying) next.play().catch(() => {});
      }
    }, 50);
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

  // Resolve playback URLs. R2 keys go through the Worker (with token); otherwise fall back to mock URLs.
  // We memoize on token+story so React doesn't tear the <video src> mid-playback when other state changes.
  const videoSrcResolved = useMemo(() => {
    if (story.videoKey) return mediaUrl(story.videoKey, token);
    return story.videoSrc;
  }, [story.videoKey, story.videoSrc, token]);
  const audioSrc = useMemo(() => {
    const key = story.audioKeyByLocale?.[audioLocale];
    if (key) return mediaUrl(key, token);
    return story.audioByLocale?.[audioLocale];
  }, [story.audioKeyByLocale, story.audioByLocale, audioLocale, token]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Click-to-toggle layer covers media area only (excludes controls + top bar) */}
      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={togglePlay}
        className="absolute inset-x-0 top-20 bottom-32 z-0 cursor-pointer"
      />

      {/* Hidden media elements — we keep both and toggle visibility/active */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={videoSrcResolved}
          className={cn(
            'absolute inset-0 w-full h-full object-contain',
            mode !== 'video' && 'invisible',
          )}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
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
          preload="metadata"
        />
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
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-bright">
            {mode === 'video' ? 'Video' : 'Audiobook'} · {audioLocale.toUpperCase()}
          </span>
          <span className="font-serif italic text-sm md:text-base text-white truncate max-w-[60vw]">
            {story.title}
          </span>
        </div>
      </div>

      {/* Controls overlay (bottom — fades on inactivity) */}
      <div
        className={cn(
          'absolute inset-0 z-20 transition-opacity duration-300 pointer-events-none',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >

        {/* Bottom controls */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-text-dim tabular-nums w-12 text-right">{formatTime(time)}</span>
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
            <span className="text-xs text-text-dim tabular-nums w-12">{formatTime(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => seekBy(-10)} aria-label="Skip back 10s">
                <SkipBack />
              </Button>
              <Button variant="rose" size="icon" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="size-14 [&_svg]:size-7">
                {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => seekBy(10)} aria-label="Skip forward 10s">
                <SkipForward />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-label="Toggle mute" className="ml-2 hidden sm:inline-flex">
                {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
              </Button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mode toggle */}
              <div className="inline-flex items-center bg-white/10 rounded-full p-1">
                {hasVideo && (
                  <button
                    onClick={() => switchMode('video')}
                    className={cn(
                      'px-3 h-9 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all',
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
                      'px-3 h-9 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all',
                      mode === 'audio'
                        ? 'bg-rose text-white shadow shadow-rose/40'
                        : 'text-text-dim hover:text-white',
                    )}
                  >
                    <Headphones className="size-3.5" /> Audio
                  </button>
                )}
                {hasEbook && (
                  <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-xs gap-1.5">
                    <Link href={`/s/${story.slug}/read` as never}>
                      <BookOpen className="size-3.5" />
                      Read
                    </Link>
                  </Button>
                )}
              </div>

              {/* Language */}
              {hasAudio && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="glass" size="sm">
                      🌐 {audioLocale.toUpperCase()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    <DropdownMenuLabel>Audio language</DropdownMenuLabel>
                    {Object.keys(story.audioKeyByLocale ?? story.audioByLocale ?? {}).map((code) => (
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

              {/* Speed */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="sm">
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
                      {s}× {s === 1 && <span className="ml-auto text-xs text-text-mute">normal</span>}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sleep timer */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="sm" aria-label="Sleep timer">
                    <Moon className="size-4" />
                    {sleepMinutes > 0 && <span className="ml-1 text-rose-bright">{sleepMinutes}m</span>}
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

              <Button variant="ghost" size="icon" onClick={fullscreen} aria-label="Fullscreen" className="hidden sm:inline-flex">
                <Maximize />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
