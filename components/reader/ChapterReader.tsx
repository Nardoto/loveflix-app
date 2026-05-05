'use client';

// Scroll-based ebook reader. Pattern: Apple Books + Wattpad + Galatea.
// One continuous vertical scroll: cover → chapters (with hero + body) →
// final. No page-turning. Tap toggles chrome. Settings sheet for font
// size + theme. Auto-bookmark per slug to localStorage.

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Image from 'next/image';
import { ArrowLeft, Heart, Settings2 } from 'lucide-react';
import { Link } from '@/lib/navigation';
import type { Story } from '@/lib/data/stories';
import {
  READING_WPM,
  type Chapter,
  type CoverBlock,
  type FinalBlock,
} from '@/lib/data/chapters';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'sepia' | 'light';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

const PREFS_KEY = 'alluretv-reader-prefs';
const bookmarkKey = (slug: string) => `alluretv-reader-bm-${slug}`;

export function ChapterReader({
  story,
  cover,
  chapters,
  final,
  totalWords,
}: {
  story: Story;
  cover: CoverBlock | null;
  chapters: Chapter[];
  final: FinalBlock | null;
  totalWords: number;
}) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(-1);

  const shellRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);

  // Load saved prefs.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { theme?: Theme; fontSize?: FontSize };
      if (p.theme) setTheme(p.theme);
      if (p.fontSize) setFontSize(p.fontSize);
    } catch {
      /* ignore corrupt prefs */
    }
  }, []);

  // Persist prefs.
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ theme, fontSize }),
      );
    } catch {
      /* quota or private mode */
    }
  }, [theme, fontSize]);

  // Restore bookmark on mount (per slug). Only restore if user is far in.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      const saved = localStorage.getItem(bookmarkKey(story.slug));
      if (!saved) return;
      const y = parseInt(saved, 10);
      if (!Number.isFinite(y) || y < 200) return;
      // Wait for layout/images to settle before scrolling.
      const t = setTimeout(() => shell.scrollTo({ top: y, behavior: 'auto' }), 80);
      return () => clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, [story.slug]);

  // Track scroll on the shell (overlay scroll container) → progress +
  // active chapter + auto-bookmark.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      const scrolled = shell.scrollTop;
      const maxScroll = shell.scrollHeight - shell.clientHeight;
      const p = maxScroll > 0 ? Math.min(100, (scrolled / maxScroll) * 100) : 0;
      setProgress(p);

      // Active chapter — first whose top has crossed 35% of the viewport.
      const probe = scrolled + shell.clientHeight * 0.35;
      let idx = -1;
      for (let i = 0; i < chapterRefs.current.length; i++) {
        const el = chapterRefs.current[i];
        if (el && el.offsetTop <= probe) idx = i;
      }
      setCurrentChapter(idx);

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(bookmarkKey(story.slug), String(scrolled));
        } catch {
          /* ignore */
        }
      }, 400);
    };

    shell.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      shell.removeEventListener('scroll', onScroll);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [story.slug]);

  // Auto-hide chrome a couple seconds in (Apple Books pattern). Skipped
  // until user has scrolled past the cover.
  useEffect(() => {
    const t = setTimeout(() => {
      const shell = shellRef.current;
      if (shell && shell.scrollTop > 100) setChromeHidden(true);
    }, 2400);
    return () => clearTimeout(t);
  }, []);

  // Tap-to-toggle chrome — clicks on the body (not buttons/links) flip the
  // chrome state. Also closes the settings sheet if open.
  const onShellClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"], input, .reader-sheet'))
      return;
    setChromeHidden((v) => !v);
    setShowSheet(false);
  }, []);

  const minutesLeft = useMemo(() => {
    const wordsLeft = Math.round((1 - progress / 100) * totalWords);
    return Math.max(1, Math.round(wordsLeft / READING_WPM));
  }, [progress, totalWords]);

  const beginReading = useCallback(() => {
    chapterRefs.current[0]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const eyebrowText =
    currentChapter < 0
      ? 'Cover'
      : (chapters[currentChapter]?.eyebrow ?? 'Reading');

  return (
    <div
      ref={shellRef}
      className="reader-shell"
      data-reader-theme={theme}
      data-reader-fs={fontSize}
      onClick={onShellClick}
    >
      {/* Top progress hairline (always visible, very thin). */}
      <div
        className="reader-progress-bar"
        style={{ ['--progress' as never]: `${progress}%` }}
        aria-hidden
      />

      {/* Top chrome */}
      <header
        className={cn(
          'reader-chrome top-chrome flex items-center gap-3 px-4 py-3',
          chromeHidden && 'is-hidden',
        )}
      >
        <Link
          href={`/s/${story.slug}` as never}
          aria-label="Close reader"
          className="grid place-items-center size-10 rounded-full hover:bg-white/5 transition-colors -ml-1"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--reader-text-mute)]">
            {eyebrowText}
          </p>
          <p className="font-serif italic text-sm truncate text-[color:var(--reader-text)]">
            {story.title}
          </p>
        </div>
      </header>

      {/* Cover */}
      {cover && (
        <section className="min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
          <div className="relative w-[min(280px,72vw)] aspect-[2/3] mb-8 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-[color:var(--reader-divider)]">
            <Image
              src={story.cover}
              alt={story.title}
              fill
              priority
              sizes="280px"
              className="object-cover"
            />
          </div>
          <p className="reader-eyebrow mb-3">A Romance Novel</p>
          <h1 className="reader-title text-4xl md:text-5xl mb-5 max-w-md">
            {story.title}
          </h1>
          <p className="text-sm md:text-base text-[color:var(--reader-text-dim)] max-w-md leading-relaxed mb-10">
            {story.synopsis}
          </p>
          <button
            onClick={beginReading}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[color:var(--reader-rose)] to-[color:var(--reader-accent-soft)] text-white font-bold text-xs tracking-[0.25em] uppercase shadow-xl shadow-black/30 hover:scale-[1.03] transition-transform"
          >
            Begin reading
          </button>
        </section>
      )}

      {/* Chapters */}
      {chapters.map((ch, i) => (
        <ChapterBlock
          key={ch.id}
          chapter={ch}
          isLast={i === chapters.length - 1 && !final}
          ref={(el) => {
            chapterRefs.current[i] = el;
          }}
        />
      ))}

      {/* Final */}
      {final && <FinalSection final={final} storySlug={story.slug} />}

      {/* Bottom chrome */}
      <footer
        className={cn(
          'reader-chrome bottom-chrome flex items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
          chromeHidden && 'is-hidden',
        )}
      >
        <div className="flex-1 min-w-0 text-xs text-[color:var(--reader-text-mute)] tabular-nums">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-0.5">
            {currentChapter >= 0
              ? `${eyebrowText} · ${currentChapter + 1} of ${chapters.length}`
              : 'Cover'}
          </p>
          <p className="text-[color:var(--reader-text-dim)]">
            {Math.round(progress)}% · {minutesLeft} min left
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSheet((v) => !v);
            setChromeHidden(false);
          }}
          className="grid place-items-center size-10 rounded-full hover:bg-white/5 transition-colors"
          aria-label="Reader settings"
        >
          <Settings2 className="size-5" />
        </button>
      </footer>

      {/* Settings bottom sheet */}
      <div
        className={cn('reader-sheet', !showSheet && 'is-hidden')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--reader-text-mute)]">
            Reading
          </p>
          <button
            onClick={() => setShowSheet(false)}
            className="text-xs text-[color:var(--reader-text-dim)] hover:text-[color:var(--reader-text)]"
          >
            Done
          </button>
        </div>

        {/* Font size */}
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--reader-text-mute)] mb-2">
            Text size
          </p>
          <div className="grid grid-cols-4 gap-1 rounded-full bg-black/15 p-1">
            {(
              [
                { v: 'sm', label: 'A', size: 13 },
                { v: 'md', label: 'A', size: 15 },
                { v: 'lg', label: 'A', size: 17 },
                { v: 'xl', label: 'A', size: 19 },
              ] as Array<{ v: FontSize; label: string; size: number }>
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFontSize(opt.v)}
                className={cn(
                  'py-2 rounded-full font-serif transition-colors',
                  fontSize === opt.v
                    ? 'bg-[color:var(--reader-accent)] text-[color:var(--reader-bg)] font-bold'
                    : 'text-[color:var(--reader-text-dim)] hover:text-[color:var(--reader-text)]',
                )}
                style={{ fontSize: `${opt.size}px` }}
                aria-label={`Text size ${opt.v}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--reader-text-mute)] mb-2">
            Theme
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'light', label: 'Cream', bg: '#fbf6ee', fg: '#2a1f1a' },
                { key: 'sepia', label: 'Sepia', bg: '#f4e8d0', fg: '#3a2a1c' },
                { key: 'dark', label: 'Night', bg: '#0a0710', fg: '#ece4ea' },
              ] as Array<{ key: Theme; label: string; bg: string; fg: string }>
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  'rounded-xl p-3 border transition-all text-left',
                  theme === t.key
                    ? 'border-[color:var(--reader-accent)] ring-1 ring-[color:var(--reader-accent)]'
                    : 'border-transparent opacity-70 hover:opacity-100',
                )}
                style={{ background: t.bg, color: t.fg }}
              >
                <span className="block text-[10px] font-bold tracking-[0.25em] uppercase">
                  {t.label}
                </span>
                <span
                  className="block font-serif italic text-base mt-1"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  Aa
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================== //
// Chapter block
// =================================================================== //

const ChapterBlock = forwardRef<
  HTMLElement,
  { chapter: Chapter; isLast: boolean }
>(function ChapterBlock({ chapter, isLast }, ref) {
  // Skip drop cap when a chapter opens with dialogue or em-dash; rendering
  // a giant punctuation glyph looks ugly and is the documented pitfall in
  // every typography style guide.
  const startsWithDialogue = /^\s*<p[^>]*>\s*[“”"'’‘—–\-]/u.test(chapter.body);

  return (
    <article ref={ref} id={chapter.id} className="reader-chapter scroll-mt-16">
      <div className="reader-hero">
        <Image
          src={chapter.hero}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 900px"
          className="object-cover"
        />
      </div>
      <div className="px-5 md:px-10 pt-10 md:pt-14">
        <p className="reader-eyebrow mb-3 text-center md:text-left">
          {chapter.eyebrow}
        </p>
        <h2 className="reader-title text-3xl md:text-5xl mb-8 max-w-[18ch] text-center md:text-left mx-auto md:mx-0">
          {chapter.title}
        </h2>
        <div
          className={cn('prose-romance', startsWithDialogue && 'no-dropcap')}
          dangerouslySetInnerHTML={{ __html: chapter.body }}
        />
      </div>
      {!isLast && <Flourish />}
    </article>
  );
});

// =================================================================== //
// Flourish — three-line scene-break style divider used between chapters
// =================================================================== //

function Flourish() {
  return (
    <div className="reader-flourish px-5 md:px-10" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 0L8.4 5.6 14 7l-5.6 1.4L7 14l-1.4-5.6L0 7l5.6-1.4L7 0z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

// =================================================================== //
// Final closing section
// =================================================================== //

function FinalSection({
  final,
  storySlug,
}: {
  final: FinalBlock;
  storySlug: string;
}) {
  return (
    <section className="min-h-[80svh] flex flex-col items-center justify-center text-center px-6 py-24">
      <Heart
        className="size-12 mb-6 text-[color:var(--reader-rose)]"
        strokeWidth={1.5}
      />
      <h2 className="reader-title text-3xl md:text-5xl mb-8 max-w-md">
        {final.title}
      </h2>
      <div
        className="prose-romance no-dropcap text-center"
        style={{ textAlign: 'center' }}
        dangerouslySetInnerHTML={{ __html: final.message }}
      />
      <Link
        href={`/s/${storySlug}` as never}
        className="mt-12 px-7 py-3 rounded-full border border-[color:var(--reader-divider)] text-[color:var(--reader-text)] text-xs tracking-[0.25em] uppercase font-bold hover:bg-white/5 transition-colors"
      >
        Back to story
      </Link>
    </section>
  );
}
