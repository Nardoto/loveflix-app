'use client';

// Roteiro markdown por idioma. 4 tabs (EN/DE/FR/ES), cada uma com uma
// textarea grande + auto-save debounced. Toolbar mínima com atalhos pros
// markdowns mais comuns + um botão pra inserir o marker {{img N}}.

import { useMemo, useRef, useState, useTransition, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ImagePlus,
  Loader2,
  Copy,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateStoryScript } from '@/app/actions/scripts';

type Locale = 'en' | 'de' | 'fr' | 'es';

const LOCALES: Array<{ id: Locale; label: string; flag: string }> = [
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'de', label: 'DE', flag: '🇩🇪' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

type Props = {
  slug: string;
  initialScripts: Partial<Record<Locale, string>>;
  /** Quantas imagens já existem na galeria — alimenta o dropdown do botão {{img N}}. */
  imageCount: number;
};

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function readingMinutes(words: number): number {
  // 200 wpm é leitura típica de romance pra audiência 55+. Arredonda pra cima.
  return Math.max(1, Math.ceil(words / 200));
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 5) return 'agora';
  if (diffSec < 60) return `há ${diffSec}s`;
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)}min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
  return `há ${Math.floor(diffSec / 86400)}d`;
}

export function EbookScriptTabs({ slug, initialScripts, imageCount }: Props) {
  const [active, setActive] = useState<Locale>('en');
  const [scripts, setScripts] = useState<Record<Locale, string>>({
    en: initialScripts.en ?? '',
    de: initialScripts.de ?? '',
    fr: initialScripts.fr ?? '',
    es: initialScripts.es ?? '',
  });
  const [savedAt, setSavedAt] = useState<Record<Locale, string | null>>({
    en: initialScripts.en ? new Date().toISOString() : null,
    de: initialScripts.de ? new Date().toISOString() : null,
    fr: initialScripts.fr ? new Date().toISOString() : null,
    es: initialScripts.es ? new Date().toISOString() : null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showImgMenu, setShowImgMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Atualiza o "salvo há Ns" a cada 10s sem precisar de re-fetch.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const currentContent = scripts[active];
  const wordCount = useMemo(() => countWords(currentContent), [currentContent]);
  const minutes = useMemo(() => readingMinutes(wordCount), [wordCount]);

  // Auto-save debounced. Cada keystroke reseta o timer; depois de 1.5s
  // sem digitar, dispara o updateStoryScript.
  const scheduleSave = useCallback(
    (locale: Locale, content: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          const res = await updateStoryScript(slug, locale, content);
          if (res.ok) {
            setSavedAt((p) => ({ ...p, [locale]: new Date().toISOString() }));
            setError(null);
          } else {
            setError(res.error);
          }
        });
      }, 1500);
    },
    [slug],
  );

  const updateContent = (next: string) => {
    setScripts((p) => ({ ...p, [active]: next }));
    scheduleSave(active, next);
  };

  /** Insere texto na posição do cursor da textarea; mantém foco. */
  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      updateContent(currentContent + snippet);
      return;
    }
    const start = el.selectionStart ?? currentContent.length;
    const end = el.selectionEnd ?? currentContent.length;
    const before = currentContent.slice(0, start);
    const after = currentContent.slice(end);
    const next = before + snippet + after;
    updateContent(next);
    // Reposiciona cursor depois do snippet, no próximo tick (após o re-render).
    requestAnimationFrame(() => {
      el.focus();
      const pos = (before + snippet).length;
      el.setSelectionRange(pos, pos);
    });
  };

  const wrapSelection = (left: string, right: string = left) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = currentContent.slice(0, start);
    const sel = currentContent.slice(start, end);
    const after = currentContent.slice(end);
    const next = before + left + (sel || 'texto') + right + after;
    updateContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = (before + left).length;
      const cursorEnd = cursorStart + (sel || 'texto').length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    // Encontra início da linha atual.
    const before = currentContent.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const head = currentContent.slice(0, lineStart);
    const lineEnd = currentContent.indexOf('\n', start);
    const rest = lineEnd >= 0 ? currentContent.slice(lineEnd) : '';
    const lineContent = currentContent.slice(
      lineStart,
      lineEnd >= 0 ? lineEnd : currentContent.length,
    );
    const next = head + prefix + lineContent + rest;
    updateContent(next);
  };

  const copyFromLocale = (from: Locale) => {
    if (from === active) return;
    const src = scripts[from];
    if (!src) return;
    setScripts((p) => ({ ...p, [active]: src }));
    scheduleSave(active, src);
    setShowCopyMenu(false);
  };

  // Atualiza relative time sem dependência do tick (referência só pra forçar re-render).
  const lastSavedLabel = useMemo(() => timeAgo(savedAt[active]), [savedAt, active, tick]);

  return (
    <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
      <header className="mb-3">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute">
          Roteiro (markdown)
        </h3>
        <p className="text-[12px] text-text-dim mt-1">
          Escreva ou cole o texto. Use{' '}
          <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
            ## Capítulo X
          </code>{' '}
          pra dividir, e{' '}
          <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
            {'{{img N}}'}
          </code>{' '}
          pra inserir uma ilustração da galeria.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-white/[0.06]">
        {LOCALES.map((l) => {
          const filled = !!scripts[l.id]?.trim();
          const isActive = l.id === active;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setActive(l.id)}
              className={[
                'px-3 py-2 text-[13px] font-bold inline-flex items-center gap-1.5 border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-rose-bright text-white'
                  : 'border-transparent text-text-dim hover:text-white',
              ].join(' ')}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {filled && <Check className="size-3 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <ToolButton onClick={() => wrapSelection('**')} title="Negrito">
          <Bold className="size-3.5" />
        </ToolButton>
        <ToolButton onClick={() => wrapSelection('*')} title="Itálico">
          <Italic className="size-3.5" />
        </ToolButton>
        <ToolButton onClick={() => insertLine('## ')} title="Capítulo (H2)">
          <Heading2 className="size-3.5" />
        </ToolButton>
        <ToolButton onClick={() => insertLine('- ')} title="Lista">
          <List className="size-3.5" />
        </ToolButton>

        {/* Dropdown {{img N}} */}
        <div className="relative">
          <ToolButton
            onClick={() => setShowImgMenu((v) => !v)}
            title="Inserir imagem"
            disabled={imageCount === 0}
          >
            <ImagePlus className="size-3.5" />
            <ChevronDown className="size-3" />
          </ToolButton>
          {showImgMenu && imageCount > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 overflow-y-auto rounded-lg bg-bg-elevated border border-white/[0.08] shadow-2xl shadow-black/60 py-1 min-w-[140px]">
              {Array.from({ length: imageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    insertAtCursor(`\n\n{{img ${n}}}\n\n`);
                    setShowImgMenu(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-[12px] text-text-soft hover:bg-white/[0.06] hover:text-white"
                >
                  Imagem #{n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Copiar de outro idioma */}
        <div className="relative ml-auto">
          <ToolButton
            onClick={() => setShowCopyMenu((v) => !v)}
            title="Copiar de outro idioma"
          >
            <Copy className="size-3.5" />
            <ChevronDown className="size-3" />
          </ToolButton>
          {showCopyMenu && (
            <div className="absolute right-0 z-10 mt-1 rounded-lg bg-bg-elevated border border-white/[0.08] shadow-2xl shadow-black/60 py-1 min-w-[140px]">
              {LOCALES.filter((l) => l.id !== active).map((l) => {
                const has = !!scripts[l.id]?.trim();
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={!has}
                    onClick={() => copyFromLocale(l.id)}
                    className="flex items-center justify-between w-full text-left px-3 py-1.5 text-[12px] text-text-soft hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>
                      {l.flag} {l.label}
                    </span>
                    {!has && <span className="text-[10px] text-text-mute">vazio</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={currentContent}
        onChange={(e) => updateContent(e.target.value)}
        placeholder={`# Título do livro\n\nPrimeiro parágrafo da abertura...\n\n{{img 1}}\n\nO encontro...\n\n## Capítulo 2 — A virada\n\n...`}
        className="input min-h-[480px] resize-y w-full font-mono text-[13px] leading-relaxed"
        spellCheck
      />

      {/* Stats */}
      <div className="flex items-center justify-between gap-3 mt-2 text-[11px] text-text-mute">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString('pt-BR')} palavras</span>
          <span>•</span>
          <span>~{minutes} min de leitura</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          {pending && <Loader2 className="size-3 animate-spin" />}
          <span>
            {pending ? 'salvando…' : `salvo ${lastSavedLabel}`}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-300">{error}</p>
      )}
    </section>
  );
}

function ToolButton({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-bg-deep border border-white/[0.06] text-text-dim hover:text-white hover:border-white/[0.20] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
