'use client';

// Versão "deferred" da seção de ebook usada APENAS no wizard de criação
// de story (NewStoryForm). Diferenças vs EbookImageGallery + EbookScriptTabs:
//
// - Não chama setEbookImageCount nem updateStoryScript (a story ainda
//   não existe no banco). Em vez disso, mantém state local e o parent
//   passa o resultado pro createStory no submit final.
// - Sem auto-save, sem indicador "salvo há Ns" — a Step "Revisão" é
//   quem confirma tudo de uma vez.
// - Upload de imagens funciona normalmente (vai pro R2 com slug já
//   resolvido na Step 1). Apenas o bookkeeping no Supabase fica pra depois.

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Bold,
  Check,
  ChevronDown,
  Copy,
  Heading2,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useMultipartUpload } from '@/lib/upload/useMultipartUpload';

type Locale = 'en' | 'de' | 'fr' | 'es';

const LOCALES: Array<{ id: Locale; label: string; flag: string }> = [
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'de', label: 'DE', flag: '🇩🇪' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

type Props = {
  slug: string;
  imagePreviews: string[];
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
  scripts: Partial<Record<Locale, string>>;
  setScripts: React.Dispatch<React.SetStateAction<Partial<Record<Locale, string>>>>;
};

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function PendingEbookSection({
  slug,
  imagePreviews,
  setImagePreviews,
  scripts,
  setScripts,
}: Props) {
  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-rose-bright/20 bg-rose/[0.04] p-4">
        <p className="text-[12px] text-text-dim leading-relaxed">
          Opcional. Sobe as ilustrações e escreve o roteiro nos idiomas
          que essa story vai estar disponível. O reader bonito do site usa
          esse conteúdo. Pode pular essa etapa e adicionar depois pela
          tela de edição.
        </p>
      </header>

      <ImageGallery
        slug={slug}
        imagePreviews={imagePreviews}
        setImagePreviews={setImagePreviews}
      />

      <ScriptTabs
        scripts={scripts}
        setScripts={setScripts}
        imageCount={imagePreviews.length}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Galeria de imagens (upload imediato pro R2, sem chamada de DB)
// ---------------------------------------------------------------------

function ImageGallery({
  slug,
  imagePreviews,
  setImagePreviews,
}: {
  slug: string;
  imagePreviews: string[];
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [pendingAdd, setPendingAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useMultipartUpload();

  const handleAdd = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPendingAdd(true);
    const nextIndex = imagePreviews.length;
    const key = await upload.start({
      storySlug: slug,
      bookNumber: 1,
      kind: 'ebook-image',
      file,
      filename: file.name,
      pageIndex: nextIndex,
    });
    if (!key) {
      setError(upload.error ?? 'Falha no upload');
      setPendingAdd(false);
      return;
    }
    // Preview local — o R2 já tem o arquivo, mas pra esta sessão usamos
    // createObjectURL pra evitar uma segunda viagem.
    setImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    setPendingAdd(false);
  };

  const handleRemove = (idx1based: number) => {
    if (!confirm(`Remover a imagem #${idx1based}?`)) return;
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx1based - 1));
  };

  const isUploading =
    upload.status === 'requesting' ||
    upload.status === 'uploading' ||
    upload.status === 'completing' ||
    pendingAdd;

  return (
    <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute">
            Ilustrações
          </h3>
          <p className="text-[12px] text-text-dim mt-1">
            Sobe as imagens em ordem. Cada uma vira o número 1, 2, 3... e
            o roteiro pode chamar com{' '}
            <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
              {'{{img N}}'}
            </code>
            .
          </p>
        </div>
        <span className="text-[11px] text-text-mute shrink-0">
          {imagePreviews.length} {imagePreviews.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </header>

      {error && (
        <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-[12px] text-red-300 flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-300 hover:text-red-200"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {imagePreviews.map((url, i) => (
          <div
            key={i}
            className="group relative aspect-video rounded-lg overflow-hidden bg-bg-deep ring-1 ring-white/10"
          >
            <Image src={url} alt="" fill sizes="200px" className="object-cover" unoptimized />
            <div className="absolute top-1.5 left-1.5 size-6 rounded-full bg-rose text-white text-[11px] font-bold grid place-items-center shadow">
              {i + 1}
            </div>
            <button
              type="button"
              aria-label={`Remover imagem ${i + 1}`}
              onClick={() => handleRemove(i + 1)}
              className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/70 hover:bg-red-500/90 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        <label
          className={[
            'aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-text-mute hover:text-rose-bright hover:border-rose-bright/50 hover:bg-rose/[0.04] cursor-pointer transition-colors',
            isUploading ? 'border-rose-bright/40 bg-rose/[0.04] text-rose-bright cursor-wait' : 'border-white/[0.10]',
          ].join(' ')}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => handleAdd(e.target.files?.[0])}
          />
          {isUploading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span className="text-[11px] font-bold">
                {upload.status === 'uploading'
                  ? `${Math.round(upload.progress * 100)}%`
                  : 'Enviando…'}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-bold inline-flex items-center gap-1">
              <Plus className="size-3" /> Adicionar
            </span>
          )}
        </label>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Editor de roteiro markdown (state local — sem auto-save)
// ---------------------------------------------------------------------

function ScriptTabs({
  scripts,
  setScripts,
  imageCount,
}: {
  scripts: Partial<Record<Locale, string>>;
  setScripts: React.Dispatch<React.SetStateAction<Partial<Record<Locale, string>>>>;
  imageCount: number;
}) {
  const [active, setActive] = useState<Locale>('en');
  const [showImgMenu, setShowImgMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentContent = scripts[active] ?? '';
  const wordCount = countWords(currentContent);

  const updateContent = (next: string) => {
    setScripts((prev) => ({ ...prev, [active]: next }));
  };

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
    updateContent(before + snippet + after);
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
    const before = currentContent.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const head = currentContent.slice(0, lineStart);
    const lineEnd = currentContent.indexOf('\n', start);
    const rest = lineEnd >= 0 ? currentContent.slice(lineEnd) : '';
    const lineContent = currentContent.slice(
      lineStart,
      lineEnd >= 0 ? lineEnd : currentContent.length,
    );
    updateContent(head + prefix + lineContent + rest);
  };

  const copyFromLocale = (from: Locale) => {
    if (from === active) return;
    const src = scripts[from] ?? '';
    if (!src) return;
    setScripts((prev) => ({ ...prev, [active]: src }));
    setShowCopyMenu(false);
  };

  return (
    <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
      <header className="mb-3">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute">
          Roteiro (markdown)
        </h3>
        <p className="text-[12px] text-text-dim mt-1">
          Escreve o texto em até 4 idiomas. Use{' '}
          <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
            ## Capítulo X
          </code>{' '}
          pra dividir, e{' '}
          <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
            {'{{img N}}'}
          </code>{' '}
          pra inserir ilustração.
        </p>
      </header>

      <div className="flex gap-1 mb-3 border-b border-white/[0.06]">
        {LOCALES.map((l) => {
          const filled = !!(scripts[l.id] ?? '').trim();
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
                const has = !!(scripts[l.id] ?? '').trim();
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

      <textarea
        ref={textareaRef}
        value={currentContent}
        onChange={(e) => updateContent(e.target.value)}
        placeholder={`# Título do livro\n\nPrimeiro parágrafo da abertura...\n\n{{img 1}}\n\nO encontro...\n\n## Capítulo 2 — A virada\n\n...`}
        className="input min-h-[360px] resize-y w-full font-mono text-[13px] leading-relaxed"
        spellCheck
      />

      <div className="flex items-center justify-between gap-3 mt-2 text-[11px] text-text-mute">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString('pt-BR')} palavras</span>
          <span>•</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 200))} min de leitura</span>
        </div>
        <span>salva no submit</span>
      </div>
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
