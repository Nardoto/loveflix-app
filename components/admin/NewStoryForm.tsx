'use client';

// YouTube Studio-style upload form. Two-column layout: form fields on
// the left, sticky preview panel on the right that shows what the user
// is uploading + the final StoryCard preview as it'll appear on the
// home. 3 steps:
//
//   1. Detalhes — title, slug, synopsis, genre, author, duration, flags
//   2. Mídia    — cover + video + 4 audio dropzones
//   3. Revisão  — full preview + Publish button
//
// All upload steps share the same UploadSlot which fixes the Substituir
// bug from v1: clicking Replace now sets a local `pickingNew` flag so
// the file picker shows even when the parent's `existing` key is still
// set from the previous upload.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Loader2,
  Music,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  X,
  Heart,
  Sparkle,
  Flame,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultipartUpload, type UploadKind } from '@/lib/upload/useMultipartUpload';
import { createStory } from '@/app/actions/admin-stories';

type Genre =
  | 'mafia'
  | 'billionaire'
  | 'forbidden'
  | 'secret_baby'
  | 'second_chance'
  | 'arranged'
  | 'royal'
  | 'mood';

const GENRES: Array<{ id: Genre; label: string }> = [
  { id: 'mafia', label: 'Mafia & Dark' },
  { id: 'billionaire', label: 'Billionaire' },
  { id: 'forbidden', label: 'Forbidden' },
  { id: 'secret_baby', label: 'Secret Baby' },
  { id: 'second_chance', label: 'Second Chance' },
  { id: 'arranged', label: 'Arranged Marriage' },
  { id: 'royal', label: 'Royal' },
  { id: 'mood', label: 'Short Mood' },
];

const LOCALES = [
  { id: 'en' as const, label: 'English', flag: '🇺🇸' },
  { id: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
  { id: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { id: 'es' as const, label: 'Español', flag: '🇪🇸' },
];

type Author = { id: string; name: string; tagline: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);

type Meta = {
  title: string;
  slug: string;
  synopsis: string;
  genre: Genre;
  authorId: string;
  totalMinutes: number;
  isFree: boolean;
  isHot: boolean;
  isPremium: boolean;
  isComingSoon: boolean;
  hasEbook: boolean;
};

type StepId = 'meta' | 'media' | 'review';
const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'meta', label: 'Detalhes' },
  { id: 'media', label: 'Mídia' },
  { id: 'review', label: 'Revisão' },
];

export function NewStoryForm({ authors }: { authors: Author[] }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>('meta');
  const [meta, setMeta] = useState<Meta>({
    title: '',
    slug: '',
    synopsis: '',
    genre: 'mafia',
    authorId: authors[0]?.id ?? '',
    totalMinutes: 45,
    isFree: false,
    isHot: false,
    isPremium: false,
    isComingSoon: false,
    hasEbook: false,
  });
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [audioKeys, setAudioKeys] = useState<Partial<Record<'en' | 'de' | 'fr' | 'es', string>>>({});
  const [ebookKey, setEbookKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'meta':
        return (
          meta.title.length >= 3 &&
          meta.slug.length >= 3 &&
          meta.synopsis.length >= 10
        );
      case 'media':
        if (!coverKey) return false;
        if (meta.isComingSoon) return true;
        return videoKey !== null && Object.keys(audioKeys).length > 0;
      case 'review':
        return true;
    }
  }, [step, meta, coverKey, videoKey, audioKeys]);

  const next = () => {
    if (!canAdvance) return;
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  };
  const prev = () => {
    const i = STEPS.findIndex((s) => s.id === step);
    if (i > 0) setStep(STEPS[i - 1].id);
  };

  const handleSubmit = async () => {
    if (!coverKey) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await createStory({
      slug: meta.slug,
      title: meta.title,
      synopsis: meta.synopsis,
      genre: meta.genre,
      tropes: [],
      authorId: meta.authorId || undefined,
      totalMinutes: meta.totalMinutes,
      ageRating: '18+',
      isFree: meta.isFree,
      isPremium: meta.isPremium,
      isHot: meta.isHot,
      isComingSoon: meta.isComingSoon,
      hasEbook: meta.hasEbook,
      coverKey,
      videoKey: videoKey ?? undefined,
      ebookKey: ebookKey ?? undefined,
      audioKeyByLocale: Object.fromEntries(
        Object.entries(audioKeys).filter(([, v]) => !!v),
      ),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/admin/stories');
      router.refresh();
    } else {
      setSubmitError(res.error);
    }
  };

  const author = authors.find((a) => a.id === meta.authorId);
  const audioCount = Object.keys(audioKeys).length;

  return (
    <div className="max-w-[1280px]">
      {/* Step indicator */}
      <ol className="flex items-center gap-3 mb-8">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li key={s.id} className="flex items-center gap-3 flex-1">
              <span
                className={[
                  'grid place-items-center size-8 rounded-full text-[12px] font-bold shrink-0 transition-colors',
                  done
                    ? 'bg-rose text-white'
                    : active
                      ? 'bg-rose-bright text-bg-deep'
                      : 'bg-white/[0.06] text-text-mute',
                ].join(' ')}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={[
                  'text-[13px] font-bold uppercase tracking-wider',
                  active ? 'text-white' : done ? 'text-rose-bright' : 'text-text-mute',
                ].join(' ')}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="flex-1 h-px bg-white/[0.06]" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Two-column body — left form, right preview panel */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* LEFT — form */}
        <div className="min-w-0">
          {step === 'meta' && (
            <MetaStep meta={meta} setMeta={setMeta} authors={authors} />
          )}
          {step === 'media' && (
            <MediaStep
              slug={meta.slug}
              isComingSoon={meta.isComingSoon}
              coverKey={coverKey}
              videoKey={videoKey}
              audioKeys={audioKeys}
              ebookKey={ebookKey}
              onCoverUploaded={(key, file) => {
                setCoverKey(key);
                if (file) setCoverPreviewUrl(URL.createObjectURL(file));
              }}
              onVideoUploaded={(key, file) => {
                setVideoKey(key);
                if (file) setVideoFilename(file.name);
              }}
              onAudioUploaded={(locale, key) =>
                setAudioKeys((prev) => ({ ...prev, [locale]: key }))
              }
              onEbookUploaded={(key) => {
                setEbookKey(key);
                if (!meta.hasEbook) setMeta((m) => ({ ...m, hasEbook: true }));
              }}
              onCoverClear={() => {
                setCoverKey(null);
                setCoverPreviewUrl(null);
              }}
              onVideoClear={() => {
                setVideoKey(null);
                setVideoFilename(null);
              }}
              onAudioClear={(locale) =>
                setAudioKeys((prev) => {
                  const next = { ...prev };
                  delete next[locale];
                  return next;
                })
              }
              onEbookClear={() => setEbookKey(null)}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              meta={meta}
              author={author}
              coverPreviewUrl={coverPreviewUrl}
              hasVideo={!!videoKey}
              audioLocales={Object.keys(audioKeys) as Array<'en' | 'de' | 'fr' | 'es'>}
              error={submitError}
            />
          )}
        </div>

        {/* RIGHT — sticky preview panel (hidden on small screens) */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <PreviewPanel
              meta={meta}
              author={author}
              coverPreviewUrl={coverPreviewUrl}
              videoFilename={videoFilename}
              audioCount={audioCount}
              hasVideo={!!videoKey}
            />
          </div>
        </aside>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
        <Button
          variant="glass"
          onClick={prev}
          disabled={stepIndex === 0 || submitting}
        >
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        {step !== 'review' ? (
          <Button variant="rose" onClick={next} disabled={!canAdvance}>
            Avançar <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="rose" onClick={handleSubmit} disabled={submitting || !coverKey}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Publicando...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Publicar story
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// STEP 1 — Detalhes
// =====================================================================

function MetaStep({
  meta,
  setMeta,
  authors,
}: {
  meta: Meta;
  setMeta: React.Dispatch<React.SetStateAction<Meta>>;
  authors: Author[];
}) {
  return (
    <div className="space-y-5">
      <Field label="Título" hint={`${meta.title.length}/280`}>
        <input
          type="text"
          value={meta.title}
          onChange={(e) => {
            const title = e.target.value;
            const auto = slugify(meta.title);
            const slugUntouched = meta.slug === '' || meta.slug === auto;
            setMeta({ ...meta, title, slug: slugUntouched ? slugify(title) : meta.slug });
          }}
          maxLength={280}
          placeholder="Como aparece pra usuária na home"
          className="input"
        />
      </Field>

      <Field label="Slug (URL)" hint="só letras, números e hífen">
        <input
          type="text"
          value={meta.slug}
          onChange={(e) => setMeta({ ...meta, slug: slugify(e.target.value) })}
          placeholder="the-mafias-bride"
          className="input font-mono text-sm"
        />
      </Field>

      <Field label="Sinopse" hint={`${meta.synopsis.length}/4000`}>
        <textarea
          value={meta.synopsis}
          onChange={(e) => setMeta({ ...meta, synopsis: e.target.value })}
          maxLength={4000}
          rows={5}
          placeholder="O que vai aparecer no hero e na página da story."
          className="input resize-y min-h-[120px]"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Gênero">
          <select
            value={meta.genre}
            onChange={(e) => setMeta({ ...meta, genre: e.target.value as Genre })}
            className="input"
          >
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Canal / Autor">
          <select
            value={meta.authorId}
            onChange={(e) => setMeta({ ...meta, authorId: e.target.value })}
            className="input"
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.tagline})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Duração (min)">
          <input
            type="number"
            value={meta.totalMinutes}
            min={1}
            max={600}
            onChange={(e) =>
              setMeta({ ...meta, totalMinutes: parseInt(e.target.value || '45', 10) })
            }
            className="input"
          />
        </Field>
      </div>

      <fieldset>
        <legend className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-mute mb-2.5">
          Flags
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Toggle label="Free" checked={meta.isFree} onChange={(v) => setMeta({ ...meta, isFree: v })} />
          <Toggle label="Premium" checked={meta.isPremium} onChange={(v) => setMeta({ ...meta, isPremium: v })} />
          <Toggle label="Hot" checked={meta.isHot} onChange={(v) => setMeta({ ...meta, isHot: v })} />
          <Toggle label="Coming Soon" checked={meta.isComingSoon} onChange={(v) => setMeta({ ...meta, isComingSoon: v })} />
          <Toggle label="Tem ebook" checked={meta.hasEbook} onChange={(v) => setMeta({ ...meta, hasEbook: v })} />
        </div>
      </fieldset>
    </div>
  );
}

// =====================================================================
// STEP 2 — Mídia (cover + video + 4 áudios todos juntos)
// =====================================================================

function MediaStep({
  slug,
  isComingSoon,
  coverKey,
  videoKey,
  audioKeys,
  ebookKey,
  onCoverUploaded,
  onVideoUploaded,
  onAudioUploaded,
  onEbookUploaded,
  onCoverClear,
  onVideoClear,
  onAudioClear,
  onEbookClear,
}: {
  slug: string;
  isComingSoon: boolean;
  coverKey: string | null;
  videoKey: string | null;
  audioKeys: Partial<Record<'en' | 'de' | 'fr' | 'es', string>>;
  ebookKey: string | null;
  onCoverUploaded: (key: string, file?: File) => void;
  onVideoUploaded: (key: string, file?: File) => void;
  onAudioUploaded: (locale: 'en' | 'de' | 'fr' | 'es', key: string) => void;
  onEbookUploaded: (key: string) => void;
  onCoverClear: () => void;
  onVideoClear: () => void;
  onAudioClear: (locale: 'en' | 'de' | 'fr' | 'es') => void;
  onEbookClear: () => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Capa" hint="Aparece no carrossel da home e na página da story (16:9 recomendado).">
        <UploadSlot
          slug={slug}
          kind="cover"
          accept="image/*"
          existing={coverKey}
          onUploaded={onCoverUploaded}
          onClear={onCoverClear}
          label="Escolher imagem"
        />
      </Section>

      <Section
        title="Vídeo principal"
        hint={isComingSoon
          ? 'Opcional — story marcada como Coming Soon.'
          : 'MP4 — pode ser pesado, sobe em chunks de 50MB.'}
      >
        <UploadSlot
          slug={slug}
          kind="video"
          accept="video/mp4,video/*"
          existing={videoKey}
          onUploaded={onVideoUploaded}
          onClear={onVideoClear}
          label="Escolher vídeo"
        />
      </Section>

      <Section
        title="Áudios por idioma"
        hint="Sobe MP3 pra cada idioma que essa story vai estar disponível. Idiomas sem áudio: a story não aparece pros usuários daquela locale (ex: só EN = não aparece na home alemã)."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LOCALES.map((l) => (
            <UploadSlot
              key={l.id}
              slug={slug}
              kind="audio"
              locale={l.id}
              accept="audio/mpeg,audio/mp3,audio/*"
              existing={audioKeys[l.id] ?? null}
              onUploaded={(key) => onAudioUploaded(l.id, key)}
              onClear={() => onAudioClear(l.id)}
              label={`${l.flag} ${l.label}`}
              compact
            />
          ))}
        </div>
      </Section>

      <Section
        title="Ebook (PDF)"
        hint="Opcional. Sobe quando o PDF estiver pronto — usuárias com a story na lista vão poder baixar."
      >
        <UploadSlot
          slug={slug}
          kind="ebook"
          accept="application/pdf"
          existing={ebookKey}
          onUploaded={(key) => onEbookUploaded(key)}
          onClear={onEbookClear}
          label="Escolher PDF"
        />
      </Section>
    </div>
  );
}

// =====================================================================
// STEP 3 — Revisão (preview real do StoryCard)
// =====================================================================

function ReviewStep({
  meta,
  author,
  coverPreviewUrl,
  hasVideo,
  audioLocales,
  error,
}: {
  meta: Meta;
  author: Author | undefined;
  coverPreviewUrl: string | null;
  hasVideo: boolean;
  audioLocales: Array<'en' | 'de' | 'fr' | 'es'>;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-mute mb-3">
          Como vai aparecer pra usuária
        </h3>
        <StoryCardPreview
          title={meta.title}
          coverUrl={coverPreviewUrl}
          author={author}
          isFree={meta.isFree}
          isHot={meta.isHot}
          isComingSoon={meta.isComingSoon}
          locales={audioLocales}
        />
      </div>

      <div className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-mute mb-3">
          Checklist
        </h3>
        <ul className="space-y-2 text-[13px]">
          <ChecklistItem ok label="Título" value={meta.title} />
          <ChecklistItem ok label="Sinopse" value={`${meta.synopsis.length} caracteres`} />
          <ChecklistItem ok label="Gênero" value={GENRES.find((g) => g.id === meta.genre)?.label ?? meta.genre} />
          <ChecklistItem ok label="Autor" value={author?.name ?? '—'} />
          <ChecklistItem ok label="Capa" value="enviada" />
          <ChecklistItem
            ok={meta.isComingSoon || hasVideo}
            label="Vídeo"
            value={hasVideo ? 'enviado' : meta.isComingSoon ? 'opcional (Coming Soon)' : 'faltando'}
          />
          <ChecklistItem
            ok={meta.isComingSoon || audioLocales.length > 0}
            label="Áudios"
            value={
              audioLocales.length > 0
                ? `${audioLocales.length}/4 idiomas (${audioLocales.map((l) => l.toUpperCase()).join(' · ')})`
                : meta.isComingSoon
                  ? 'opcional (Coming Soon)'
                  : 'faltando'
            }
          />
        </ul>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-red-300 mb-1">
            Não consegui publicar
          </p>
          <p className="text-sm text-red-200 leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-baseline gap-2.5">
      <span
        className={[
          'shrink-0 size-4 rounded-full grid place-items-center text-[10px] mt-0.5',
          ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300',
        ].join(' ')}
      >
        {ok ? <Check className="size-2.5" /> : '!'}
      </span>
      <span className="text-text-dim w-24 shrink-0">{label}</span>
      <span className="text-text-soft flex-1 truncate">{value}</span>
    </li>
  );
}

// =====================================================================
// Right column — sticky preview panel
// =====================================================================

function PreviewPanel({
  meta,
  author,
  coverPreviewUrl,
  videoFilename,
  audioCount,
  hasVideo,
}: {
  meta: Meta;
  author: Author | undefined;
  coverPreviewUrl: string | null;
  videoFilename: string | null;
  audioCount: number;
  hasVideo: boolean;
}) {
  return (
    <div className="rounded-2xl bg-bg-card border border-white/[0.06] overflow-hidden">
      {/* Cover preview area (16:9) */}
      <div className="relative aspect-video bg-bg-deep">
        {coverPreviewUrl ? (
          <Image
            src={coverPreviewUrl}
            alt=""
            fill
            sizes="360px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-mute">
            <div className="text-center">
              <ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-[11px] uppercase tracking-wider">Sem capa</p>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-mute mb-1">
            Pré-visualização
          </p>
          <h4 className="font-serif italic font-bold text-white text-[15px] leading-snug line-clamp-2 min-h-[2.4em]">
            {meta.title || 'Sem título'}
          </h4>
          {author && (
            <p className="text-[11px] text-text-dim mt-1">por {author.name}</p>
          )}
        </div>

        <div className="space-y-1.5 pt-3 border-t border-white/[0.05]">
          <PreviewRow
            label="Capa"
            value={coverPreviewUrl ? 'Enviada' : 'Faltando'}
            ok={!!coverPreviewUrl}
          />
          <PreviewRow
            label="Vídeo"
            value={
              hasVideo
                ? videoFilename ?? 'Enviado'
                : meta.isComingSoon
                  ? '—'
                  : 'Faltando'
            }
            ok={hasVideo || meta.isComingSoon}
          />
          <PreviewRow
            label="Áudios"
            value={`${audioCount}/4 idiomas`}
            ok={audioCount > 0 || meta.isComingSoon}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-text-mute">
        {label}
      </span>
      <span
        className={[
          'text-[12px] font-semibold truncate',
          ok ? 'text-emerald-300' : 'text-amber-300',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

// =====================================================================
// Story card — actually rendered as it'll appear on the home
// =====================================================================

function StoryCardPreview({
  title,
  coverUrl,
  author,
  isFree,
  isHot,
  isComingSoon,
  locales,
}: {
  title: string;
  coverUrl: string | null;
  author: Author | undefined;
  isFree: boolean;
  isHot: boolean;
  isComingSoon: boolean;
  locales: string[];
}) {
  return (
    <div className="max-w-[340px]">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-bg-card shadow-lg shadow-black/50 ring-1 ring-white/10">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="340px"
            className="object-cover object-[center_28%]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-mute bg-bg-deep">
            <ImageIcon className="size-8 opacity-50" />
          </div>
        )}
        {/* badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isComingSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gold-bright text-bg-deep text-[10px] font-bold">
              SOON
            </span>
          )}
          {!isComingSoon && isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-400 text-bg-deep text-[10px] font-bold">
              <Sparkle className="size-3" /> FREE
            </span>
          )}
          {!isComingSoon && isHot && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500 text-white text-[10px] font-bold">
              <Flame className="size-3" /> HOT
            </span>
          )}
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="font-serif italic text-[14px] md:text-[15px] font-semibold text-white leading-snug line-clamp-2 min-h-[2.4em]">
          {title || 'Sem título'}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-text-dim leading-none flex items-baseline gap-1 truncate min-w-0">
            <span className="opacity-70">by</span>
            <span className="text-gold-bright text-[14px] truncate">
              {author?.name ?? '—'}
            </span>
          </p>
          {locales.length > 0 && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-mute shrink-0">
              {locales.map((l) => l.toUpperCase()).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Reusable upload slot — fixes the Substituir bug from v1
// =====================================================================

function UploadSlot({
  slug,
  kind,
  locale,
  accept,
  existing,
  onUploaded,
  onClear,
  label,
  compact = false,
}: {
  slug: string;
  kind: UploadKind;
  locale?: 'en' | 'de' | 'fr' | 'es';
  accept: string;
  existing: string | null;
  onUploaded: (key: string, file?: File) => void;
  onClear?: () => void;
  label: string;
  compact?: boolean;
}) {
  const upload = useMultipartUpload();
  // Local "show file picker" flag — gets set to true when user clicks
  // Substituir, so the picker re-shows even though `existing` (parent
  // state) is still set. Cleared when the new upload completes.
  const [pickingNew, setPickingNew] = useState(false);

  const isUploading =
    upload.status === 'requesting' ||
    upload.status === 'uploading' ||
    upload.status === 'completing';
  const showSuccess = !!existing && !pickingNew && !isUploading;
  const showPicker = !showSuccess && !isUploading;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPickingNew(false);
    upload
      .start({
        storySlug: slug,
        bookNumber: 1,
        kind,
        locale,
        file,
        filename: file.name,
      })
      .then((key) => {
        if (key) onUploaded(key, file);
      });
  };

  // ---- States ------------------------------------------------------

  if (isUploading) {
    const pct = Math.round(upload.progress * 100);
    return (
      <div className={`rounded-xl border border-rose-bright/30 bg-rose/[0.05] p-4 ${compact ? '' : 'p-5'}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="size-9 rounded-lg bg-rose-bright/20 grid place-items-center text-rose-bright shrink-0">
            <Loader2 className="size-4 animate-spin" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">
              {upload.status === 'requesting' && 'Preparando…'}
              {upload.status === 'uploading' && `Enviando ${pct}%`}
              {upload.status === 'completing' && 'Finalizando…'}
            </p>
            <p className="text-[11px] text-text-mute">
              {(upload.uploadedBytes / 1024 / 1024).toFixed(1)} de{' '}
              {(upload.totalBytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={upload.abort}
            aria-label="Cancelar"
            className="size-8 grid place-items-center rounded-full hover:bg-white/[0.05] text-text-dim shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose to-rose-bright transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className={`rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 ${compact ? '' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-lg bg-emerald-500/20 grid place-items-center text-emerald-300 shrink-0">
            <Check className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">{label}</p>
            <p className="text-[10px] font-mono text-text-mute mt-0.5 line-clamp-1">
              {existing}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickingNew(true)}
            className="text-[11px] font-bold uppercase tracking-wider text-rose-bright hover:text-rose inline-flex items-center gap-1"
          >
            <RefreshCw className="size-3.5" /> Substituir
          </button>
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                upload.reset();
                setPickingNew(false);
              }}
              aria-label="Remover"
              title="Remover"
              className="size-8 grid place-items-center rounded-lg text-text-dim hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {upload.status === 'error' && upload.error && (
          <p className="text-[11px] text-red-300 mt-2">{upload.error}</p>
        )}
      </div>
    );
  }

  return (
    <label
      className={[
        'block cursor-pointer rounded-xl border-2 border-dashed border-white/[0.10] hover:border-rose-bright/50 hover:bg-rose/[0.03] transition-colors',
        compact ? 'p-4' : 'p-6 text-center',
      ].join(' ')}
    >
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className={compact ? 'flex items-center gap-3' : ''}>
        {!compact && (
          <span className="size-12 mx-auto mb-3 rounded-xl bg-rose-bright/10 grid place-items-center text-rose-bright">
            {kind === 'cover' ? (
              <ImageIcon className="size-5" />
            ) : kind === 'video' ? (
              <Video className="size-5" />
            ) : kind === 'ebook' ? (
              <BookOpen className="size-5" />
            ) : (
              <Music className="size-5" />
            )}
          </span>
        )}
        {compact && (
          <span className="size-8 rounded-lg bg-rose-bright/10 grid place-items-center text-rose-bright shrink-0">
            <Music className="size-4" />
          </span>
        )}
        <div className={compact ? 'flex-1 min-w-0' : ''}>
          <p className={`font-bold text-white ${compact ? 'text-[13px]' : ''}`}>
            {label}
          </p>
          {!compact && (
            <p className="text-xs text-text-dim mt-1 inline-flex items-center gap-1.5">
              <Upload className="size-3.5" /> Clique pra escolher arquivo
            </p>
          )}
          {compact && (
            <p className="text-[11px] text-text-dim mt-0.5">
              Clique pra subir MP3
            </p>
          )}
        </div>
      </div>
      {pickingNew && (
        <p className="text-[10px] text-text-mute mt-2 text-center">
          Substituindo o arquivo anterior…
        </p>
      )}
      {upload.status === 'error' && upload.error && (
        <p className="text-[11px] text-red-300 mt-2">{upload.error}</p>
      )}
    </label>
  );
}

// =====================================================================
// Atoms
// =====================================================================

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-white mb-1">
        {title}
      </h3>
      {hint && <p className="text-[12px] text-text-dim mb-3">{hint}</p>}
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-bold uppercase tracking-wider text-text-mute">
          {label}
        </span>
        {hint && <span className="text-[10px] text-text-mute">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors',
        checked
          ? 'bg-rose/15 border-rose/40 text-rose-bright'
          : 'bg-bg-card border-white/[0.06] text-text-dim hover:border-white/[0.15]',
      ].join(' ')}
    >
      <span>{label}</span>
      <span
        className={[
          'size-4 rounded grid place-items-center text-white text-[10px]',
          checked ? 'bg-rose' : 'bg-white/[0.06]',
        ].join(' ')}
      >
        {checked && <Check className="size-3" />}
      </span>
    </button>
  );
}
