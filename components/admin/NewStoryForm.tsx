'use client';

// Multistep upload form for /admin/stories/new. Each step has its own
// validation; the operator can't advance with missing fields.
//
//   1. Metadata        — title, slug, synopsis, genre, author, flags
//   2. Cover           — single 16:9 image (multipart still works for >5MB)
//   3. Video           — MP4, multipart with progress + cancelable
//   4. Audio (4 langs) — EN/DE/FR/ES, all optional but at least one if not
//                        coming-soon
//   5. Review          — recap + Publish button → calls createStory()

import { useMemo, useState } from 'react';
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

const LOCALES: Array<{ id: 'en' | 'de' | 'fr' | 'es'; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'fr', label: 'Français' },
  { id: 'es', label: 'Español' },
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

type StepId = 'meta' | 'cover' | 'video' | 'audio' | 'review';
const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'meta', label: 'Metadata' },
  { id: 'cover', label: 'Capa' },
  { id: 'video', label: 'Vídeo' },
  { id: 'audio', label: 'Áudios' },
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
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [audioKeys, setAudioKeys] = useState<Partial<Record<'en' | 'de' | 'fr' | 'es', string>>>({});
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
      case 'cover':
        return coverKey !== null;
      case 'video':
        // Video is optional for coming-soon stories.
        return meta.isComingSoon || videoKey !== null;
      case 'audio':
        // At least one audio for non-coming-soon.
        return meta.isComingSoon || Object.keys(audioKeys).length > 0;
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
      // Strip undefined entries before passing — Zod's record schema is
      // typed as Record<...>, not Partial<Record<...>>.
      audioKeyByLocale: Object.fromEntries(
        Object.entries(audioKeys).filter(([, v]) => !!v),
      ) as Record<'en' | 'de' | 'fr' | 'es', string>,
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/admin/stories');
      router.refresh();
    } else {
      setSubmitError(res.error);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li key={s.id} className="flex items-center gap-2 flex-1">
              <span
                className={[
                  'grid place-items-center size-7 rounded-full text-[11px] font-bold shrink-0',
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
                  'text-[12px] font-bold uppercase tracking-wider hidden sm:inline',
                  active
                    ? 'text-white'
                    : done
                      ? 'text-rose-bright'
                      : 'text-text-mute',
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

      {/* Step bodies */}
      {step === 'meta' && (
        <MetaStep meta={meta} setMeta={setMeta} authors={authors} slugify={slugify} />
      )}
      {step === 'cover' && (
        <UploadStep
          slug={meta.slug}
          kind="cover"
          accept="image/*"
          icon={<ImageIcon className="size-7" />}
          label="Capa 16:9"
          hint="JPEG ou PNG. Recomendado 1920×1080."
          existing={coverKey}
          onUploaded={setCoverKey}
        />
      )}
      {step === 'video' && (
        <UploadStep
          slug={meta.slug}
          kind="video"
          accept="video/mp4,video/*"
          icon={<Video className="size-7" />}
          label="Vídeo principal"
          hint="MP4, qualquer tamanho. Upload em chunks de 50MB."
          existing={videoKey}
          onUploaded={setVideoKey}
          optional={meta.isComingSoon}
        />
      )}
      {step === 'audio' && (
        <AudioStep
          slug={meta.slug}
          audioKeys={audioKeys}
          setAudioKeys={setAudioKeys}
          required={!meta.isComingSoon}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          meta={meta}
          coverKey={coverKey}
          videoKey={videoKey}
          audioKeys={audioKeys}
          authors={authors}
          submitting={submitting}
          error={submitError}
          onSubmit={handleSubmit}
        />
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
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

// ---------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------

function MetaStep({
  meta,
  setMeta,
  authors,
  slugify,
}: {
  meta: Meta;
  setMeta: React.Dispatch<React.SetStateAction<Meta>>;
  authors: Author[];
  slugify: (s: string) => string;
}) {
  return (
    <div className="space-y-5">
      <Field label="Título" hint={`${meta.title.length}/280`}>
        <input
          type="text"
          value={meta.title}
          onChange={(e) => {
            const title = e.target.value;
            // Auto-derive slug while it stays empty or matches the
            // previous auto-derivation. Once the operator edits the slug
            // manually, leave it alone.
            const auto = slugify(meta.title);
            const slugUntouched = meta.slug === '' || meta.slug === auto;
            setMeta({ ...meta, title, slug: slugUntouched ? slugify(title) : meta.slug });
          }}
          maxLength={280}
          placeholder="The Mafia's Bride"
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
          placeholder="Quando ela cruzou o salão de baile..."
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

      <fieldset className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <legend className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-mute mb-2">
          Flags
        </legend>
        <Toggle
          label="Free"
          checked={meta.isFree}
          onChange={(v) => setMeta({ ...meta, isFree: v })}
        />
        <Toggle
          label="Premium"
          checked={meta.isPremium}
          onChange={(v) => setMeta({ ...meta, isPremium: v })}
        />
        <Toggle
          label="Hot"
          checked={meta.isHot}
          onChange={(v) => setMeta({ ...meta, isHot: v })}
        />
        <Toggle
          label="Coming Soon"
          checked={meta.isComingSoon}
          onChange={(v) => setMeta({ ...meta, isComingSoon: v })}
        />
        <Toggle
          label="Tem ebook"
          checked={meta.hasEbook}
          onChange={(v) => setMeta({ ...meta, hasEbook: v })}
        />
      </fieldset>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-card, #110a14);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: var(--rose, #e85d8a);
        }
      `}</style>
    </div>
  );
}

function UploadStep({
  slug,
  kind,
  accept,
  icon,
  label,
  hint,
  existing,
  onUploaded,
  locale,
  optional = false,
}: {
  slug: string;
  kind: UploadKind;
  accept: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  existing: string | null;
  onUploaded: (key: string) => void;
  locale?: 'en' | 'de' | 'fr' | 'es';
  optional?: boolean;
}) {
  const upload = useMultipartUpload();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    upload.start({
      storySlug: slug,
      bookNumber: 1,
      kind,
      locale,
      file,
      filename: file.name,
    }).then((key) => {
      if (key) onUploaded(key);
    });
  };

  if (existing && upload.status !== 'uploading' && upload.status !== 'completing') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="size-10 rounded-xl bg-emerald-500/20 grid place-items-center text-emerald-300">
            <Check className="size-5" />
          </span>
          <div>
            <p className="font-bold text-white text-sm">Upload concluído</p>
            <p className="text-[11px] text-text-mute font-mono break-all">{existing}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => upload.reset()}
          className="text-[12px] text-rose-bright hover:text-rose font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="size-3.5" /> Substituir
        </button>
      </div>
    );
  }

  if (upload.status === 'uploading' || upload.status === 'completing' || upload.status === 'requesting') {
    const pct = Math.round(upload.progress * 100);
    return (
      <div className="rounded-2xl border border-rose-bright/30 bg-rose/[0.05] p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="size-10 rounded-xl bg-rose-bright/20 grid place-items-center text-rose-bright">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">
              {upload.status === 'requesting' && 'Preparando...'}
              {upload.status === 'uploading' && `Enviando ${pct}%`}
              {upload.status === 'completing' && 'Finalizando...'}
            </p>
            <p className="text-[11px] text-text-mute">
              {(upload.uploadedBytes / 1024 / 1024).toFixed(1)} MB de{' '}
              {(upload.totalBytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={upload.abort}
            aria-label="Cancelar upload"
            className="size-9 grid place-items-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-text-dim"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose to-rose-bright transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-white/[0.10] hover:border-rose-bright/50 hover:bg-rose/[0.03] transition-colors p-8 text-center">
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="size-14 mx-auto mb-3 rounded-2xl bg-rose-bright/10 grid place-items-center text-rose-bright">
        {icon}
      </div>
      <p className="font-bold text-white">{label}</p>
      <p className="text-xs text-text-dim mt-1">{hint}</p>
      {optional && (
        <p className="text-[10px] text-text-mute uppercase tracking-wider mt-3">
          Opcional (story marcada como Coming Soon)
        </p>
      )}
      <p className="text-[11px] text-rose-bright mt-4 inline-flex items-center gap-1.5">
        <Upload className="size-3.5" /> Clique pra escolher arquivo
      </p>
      {upload.status === 'error' && upload.error && (
        <p className="text-xs text-red-400 mt-3">{upload.error}</p>
      )}
    </label>
  );
}

function AudioStep({
  slug,
  audioKeys,
  setAudioKeys,
  required,
}: {
  slug: string;
  audioKeys: Partial<Record<'en' | 'de' | 'fr' | 'es', string>>;
  setAudioKeys: React.Dispatch<
    React.SetStateAction<Partial<Record<'en' | 'de' | 'fr' | 'es', string>>>
  >;
  required: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-text-dim">
        Sobe um áudio MP3 por idioma. Idiomas sem áudio simplesmente não
        aparecem pros usuários daquela locale.{' '}
        {required && (
          <span className="text-amber-300">
            (Pelo menos um é obrigatório porque a story não está marcada como Coming Soon.)
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LOCALES.map((l) => (
          <UploadStep
            key={l.id}
            slug={slug}
            kind="audio"
            locale={l.id}
            accept="audio/mpeg,audio/mp3,audio/*"
            icon={<Music className="size-5" />}
            label={l.label}
            hint="MP3"
            existing={audioKeys[l.id] ?? null}
            onUploaded={(key) => setAudioKeys((prev) => ({ ...prev, [l.id]: key }))}
            optional
          />
        ))}
      </div>
    </div>
  );
}

function ReviewStep({
  meta,
  coverKey,
  videoKey,
  audioKeys,
  authors,
  submitting,
  error,
  onSubmit,
}: {
  meta: Meta;
  coverKey: string | null;
  videoKey: string | null;
  audioKeys: Partial<Record<string, string>>;
  authors: Author[];
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const author = authors.find((a) => a.id === meta.authorId);
  const flags = [
    meta.isFree && 'Free',
    meta.isPremium && 'Premium',
    meta.isHot && 'Hot',
    meta.isComingSoon && 'Coming Soon',
    meta.hasEbook && 'Ebook',
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
        <h3 className="font-serif italic font-bold text-xl text-white mb-1">
          {meta.title}
        </h3>
        <p className="text-[12px] text-text-mute font-mono mb-3">/s/{meta.slug}</p>
        <p className="text-sm text-text-soft mb-4 line-clamp-3">{meta.synopsis}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-[12px]">
          <ReviewKv k="Gênero" v={meta.genre} />
          <ReviewKv k="Autor" v={author?.name ?? meta.authorId} />
          <ReviewKv k="Duração" v={`${meta.totalMinutes} min`} />
          <ReviewKv k="Capa" v={coverKey ? '✓' : '—'} />
          <ReviewKv k="Vídeo" v={videoKey ? '✓' : '—'} />
          <ReviewKv
            k="Áudios"
            v={
              Object.keys(audioKeys).length
                ? Object.keys(audioKeys).join(' · ').toUpperCase()
                : '—'
            }
          />
          {flags.length > 0 && (
            <ReviewKv k="Flags" v={flags.join(' · ')} className="col-span-full" />
          )}
        </dl>
      </div>
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {submitting && (
        <div className="text-sm text-text-dim flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Salvando no Supabase + invalidando cache...
        </div>
      )}
    </div>
  );
}

function ReviewKv({
  k,
  v,
  className,
}: {
  k: string;
  v: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-text-mute uppercase tracking-wider text-[10px] font-bold">
        {k}
      </dt>
      <dd className="text-text-soft mt-0.5 capitalize">{v}</dd>
    </div>
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
