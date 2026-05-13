'use client';

// Reader in-app pra roteiro markdown. Reusa o chrome visual (CSS vars
// --reader-bg / --reader-text / --reader-accent) que o ChapterReader
// usa, e os mesmos toggles de tema/fonte. Diferente do ChapterReader,
// que renderiza dados estruturados (CoverBlock + Chapter[] + FinalBlock),
// este aqui pega markdown + galeria de imagens e renderiza com
// react-markdown, substituindo `![](ebookimg:N)` pela imagem real.
//
// Otimizado pra leitura de romance pela audiência 55+:
// - fontes default maiores (18px md, 22px xl)
// - linha curta (max-w-prose, ~65ch)
// - scroll vertical contínuo
// - tap-to-toggle chrome no mobile
// - autobookmark do scrollTop por slug+locale
// - sépia/dia/noite

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Settings2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import {
  preprocessScript,
  parseEbookImageSrc,
  estimateReadingMinutes,
} from '@/lib/markdown';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'sepia' | 'light';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

const PREFS_KEY = 'alluretv-reader-prefs';
const bookmarkKey = (slug: string, locale: string) =>
  `alluretv-reader-pos-${slug}-${locale}`;

type Props = {
  storyTitle: string;
  storyCover: string;
  storySlug: string;
  locale: string;
  script: string;
  /** URLs das imagens da galeria já com token assinado. */
  imageUrls: string[];
  /** Locale que foi efetivamente carregada (pode ser fallback). */
  scriptLocale: 'en' | 'de' | 'fr' | 'es';
  /** Se rolou fallback pro EN porque a locale do usuário não tinha texto. */
  isFallback: boolean;
};

export function ScriptReader({
  storyTitle,
  storyCover,
  storySlug,
  locale,
  script,
  imageUrls,
  scriptLocale,
  isFallback,
}: Props) {
  const t = useTranslations('reader');
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [progress, setProgress] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);

  // Markdown pré-processado: troca `{{img N}}` por `![](ebookimg:N)`.
  const processedScript = useMemo(() => preprocessScript(script), [script]);
  const totalMinutes = useMemo(() => estimateReadingMinutes(script), [script]);

  // Load saved prefs (compartilhadas entre ChapterReader e ScriptReader)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { theme?: Theme; fontSize?: FontSize };
      if (p.theme) setTheme(p.theme);
      if (p.fontSize) setFontSize(p.fontSize);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ theme, fontSize }));
    } catch {
      /* ignore */
    }
  }, [theme, fontSize]);

  // Restore scroll position (scrolls dentro do .reader-shell, não no window
  // — o globals.css aplica position:fixed nele).
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    try {
      const saved = localStorage.getItem(bookmarkKey(storySlug, locale));
      if (saved) {
        const pos = parseInt(saved, 10);
        if (Number.isFinite(pos) && pos > 0) {
          requestAnimationFrame(() => el.scrollTo({ top: pos, behavior: 'auto' }));
        }
      }
    } catch {
      /* ignore */
    }
  }, [storySlug, locale]);

  // Save scroll position (throttled via rAF) — listen no próprio shell.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    let raf = 0;
    let lastSaved = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = el.scrollTop;
        const docH = el.scrollHeight - el.clientHeight;
        const pct = docH > 0 ? Math.min(100, Math.round((top / docH) * 100)) : 0;
        setProgress(pct);
        if (Date.now() - lastSaved > 1000) {
          try {
            localStorage.setItem(bookmarkKey(storySlug, locale), String(top));
            lastSaved = Date.now();
          } catch {
            /* ignore */
          }
        }
      });
    };
    el.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => {
      el.removeEventListener('scroll', handler);
      cancelAnimationFrame(raf);
    };
  }, [storySlug, locale]);

  const toggleChrome = useCallback(() => {
    if (showSheet) return;
    setChromeHidden((v) => !v);
  }, [showSheet]);

  // Componentes customizados pro markdown
  // react-markdown >=9 passa props mais permissivas (src pode ser Blob).
  // Tipamos como any e validamos em runtime.
  const mdComponents = useMemo(
    () => ({
      // Imagem inline: detecta o protocolo `ebookimg:` e renderiza a galeria.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      img: (props: any) => {
        const src = typeof props.src === 'string' ? props.src : '';
        const alt = typeof props.alt === 'string' ? props.alt : '';
        const idx = parseEbookImageSrc(src);
        if (idx !== null) {
          const url = imageUrls[idx - 1];
          if (!url) return null;
          return (
            <figure className="my-8 -mx-5 sm:mx-0 sm:rounded-2xl overflow-hidden">
              <div className="relative aspect-[16/9] bg-black/30">
                <Image
                  src={url}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </figure>
          );
        }
        // Imagem markdown normal — improvável no nosso fluxo, mas seguro.
        if (!src) return null;
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt} loading="lazy" />;
      },
      h1: (props: React.ComponentProps<'h1'>) => (
        <h1
          className="font-serif italic font-black text-3xl md:text-4xl text-center mt-10 mb-6"
          {...props}
        />
      ),
      h2: (props: React.ComponentProps<'h2'>) => (
        <h2
          className="font-serif italic font-black text-2xl md:text-3xl mt-14 mb-6 text-center text-[color:var(--reader-accent)] reader-chapter-title"
          {...props}
        />
      ),
      h3: (props: React.ComponentProps<'h3'>) => (
        <h3 className="font-serif italic font-bold text-xl mt-8 mb-3" {...props} />
      ),
      p: (props: React.ComponentProps<'p'>) => (
        <p className="my-5 leading-[1.75]" {...props} />
      ),
      blockquote: (props: React.ComponentProps<'blockquote'>) => (
        <blockquote
          className="my-6 pl-5 border-l-2 border-[color:var(--reader-accent)] italic opacity-90"
          {...props}
        />
      ),
      hr: () => (
        <hr className="my-10 mx-auto w-24 border-0 border-t border-[color:var(--reader-text-dim)] opacity-40" />
      ),
    }),
    [imageUrls],
  );

  return (
    <div
      ref={shellRef}
      data-reader-theme={theme}
      data-reader-fs={fontSize}
      onClick={(e) => {
        // Tap-to-toggle chrome só ativa quando clica no fundo. Header,
        // footer e settings sheet stop propagation.
        if (e.target === e.currentTarget) toggleChrome();
      }}
      className="reader-shell pb-24"
    >
      {/* HEADER */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3 transition-transform duration-300',
          'backdrop-blur-md bg-[color:var(--reader-bg)]/85 border-b border-[color:var(--reader-text-dim)]/20',
          chromeHidden && '-translate-y-full',
        )}
      >
        <Link
          href={`/s/${storySlug}` as never}
          aria-label={t('back')}
          className="size-9 grid place-items-center rounded-full hover:bg-[color:var(--reader-text-dim)]/15"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 truncate text-[14px] font-bold font-serif italic">
          {storyTitle}
        </h1>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowSheet(true);
          }}
          aria-label={t('settings')}
          className="size-9 grid place-items-center rounded-full hover:bg-[color:var(--reader-text-dim)]/15"
        >
          <Settings2 className="size-5" />
        </button>
      </header>

      {/* Fallback banner — só se o usuário pediu uma locale e mostramos outra */}
      {isFallback && (
        <div className="pt-16 pb-2 px-5 md:px-8">
          <div className="max-w-prose mx-auto text-center text-[12px] text-[color:var(--reader-text-dim)] py-2 px-4 rounded-full bg-[color:var(--reader-text-dim)]/10">
            {t('localeFallback', { locale: scriptLocale.toUpperCase() })}
          </div>
        </div>
      )}

      {/* COVER hero */}
      <section
        className={cn(
          'relative w-full aspect-[16/10] max-h-[60vh]',
          !isFallback && 'pt-16',
        )}
      >
        <Image
          src={storyCover}
          alt={storyTitle}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--reader-bg)] via-[color:var(--reader-bg)]/30 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-10 text-center">
          <h1 className="font-serif italic font-black text-3xl sm:text-4xl md:text-5xl drop-shadow-[0_3px_14px_rgba(0,0,0,0.85)] text-white">
            {storyTitle}
          </h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.3em] text-white/80">
            {t('estimatedTime', { minutes: totalMinutes })}
          </p>
        </div>
      </section>

      {/* BODY — markdown rendered */}
      <article
        className={cn(
          'reader-body mx-auto px-5 md:px-8 pt-12 pb-32',
          'max-w-prose',
        )}
        style={{
          fontSize: 'var(--reader-fs)',
          lineHeight: 'var(--reader-lh)',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {processedScript}
        </ReactMarkdown>

        <div className="mt-16 mb-8 text-center text-[color:var(--reader-text-dim)]">
          <p className="text-[11px] uppercase tracking-[0.3em] mb-2">{t('endTitle')}</p>
          <p className="font-serif italic text-sm">{t('endTagline')}</p>
        </div>
      </article>

      {/* FOOTER — progresso */}
      <footer
        className={cn(
          'fixed bottom-0 inset-x-0 z-30 px-4 md:px-8 py-2 transition-transform duration-300',
          'backdrop-blur-md bg-[color:var(--reader-bg)]/85 border-t border-[color:var(--reader-text-dim)]/20',
          chromeHidden && 'translate-y-full',
        )}
      >
        <div className="flex items-center gap-3 text-[11px] text-[color:var(--reader-text-dim)]">
          <div className="flex-1 h-1 rounded-full bg-[color:var(--reader-text-dim)]/15 overflow-hidden">
            <div
              className="h-full bg-[color:var(--reader-accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-bold tabular-nums">{progress}%</span>
        </div>
      </footer>

      {/* SETTINGS sheet */}
      {showSheet && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm grid place-items-end sm:place-items-center"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full sm:max-w-md mx-auto rounded-t-3xl sm:rounded-3xl bg-[color:var(--reader-bg)] text-[color:var(--reader-text)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between mb-5">
              <h3 className="font-serif italic font-bold text-xl">{t('settings')}</h3>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="size-8 grid place-items-center rounded-full hover:bg-[color:var(--reader-text-dim)]/15"
                aria-label={t('close')}
              >
                <X className="size-4" />
              </button>
            </header>

            {/* Font size */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--reader-text-mute)] mb-2">
                {t('textSize')}
              </p>
              <div className="grid grid-cols-4 gap-1 rounded-full bg-black/15 p-1">
                {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setFontSize(v)}
                    className={cn(
                      'py-2 rounded-full font-serif transition-colors',
                      fontSize === v
                        ? 'bg-[color:var(--reader-accent)] text-[color:var(--reader-bg)] font-bold'
                        : 'text-[color:var(--reader-text-dim)] hover:text-[color:var(--reader-text)]',
                    )}
                    style={{ fontSize: `${13 + i * 2}px` }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--reader-text-mute)] mb-2">
                {t('theme')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'light', label: t('themes.cream'), bg: '#fbf6ee', fg: '#2a1f1a' },
                    { key: 'sepia', label: t('themes.sepia'), bg: '#f4e8d0', fg: '#3a2a1c' },
                    { key: 'dark', label: t('themes.night'), bg: '#0a0710', fg: '#ece4ea' },
                  ] as Array<{ key: Theme; label: string; bg: string; fg: string }>
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    className={cn(
                      'rounded-xl p-3 border transition-all text-left',
                      theme === opt.key
                        ? 'border-[color:var(--reader-accent)] ring-1 ring-[color:var(--reader-accent)]'
                        : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                    style={{ background: opt.bg, color: opt.fg }}
                  >
                    <span className="block text-[10px] font-bold tracking-[0.25em] uppercase">
                      {opt.label}
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
      )}
    </div>
  );
}
