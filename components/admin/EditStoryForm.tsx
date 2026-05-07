'use client';

// Single-page editor for an existing story. Shows current asset state
// (cover/video/audio per locale), lets the operator re-upload any of
// them (writes to the same R2 key — the worker will serve the new bytes
// transparently), tweak metadata, then Save → calls updateStory.
//
// Delete and Publish/Unpublish live in the danger zone at the bottom.

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  Loader2,
  Music,
  Save,
  Trash2,
  Video,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultipartUpload, type UploadKind } from '@/lib/upload/useMultipartUpload';
import {
  updateStory,
  deleteStory,
  publishStory,
  unpublishStory,
} from '@/app/actions/admin-stories';

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
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
  { id: 'fr', label: 'FR' },
  { id: 'es', label: 'ES' },
];

type Author = { id: string; name: string; tagline: string };

type StoryInit = {
  slug: string;
  title: string;
  synopsis: string;
  genre: Genre;
  totalMinutes: number;
  isFree: boolean;
  isHot: boolean;
  isPremium: boolean;
  isComingSoon: boolean;
  hasEbook: boolean;
  coverKey: string | null;
  coverUrl: string;
  videoKey: string | null;
  audioKeys: Record<string, string>;
};

export function EditStoryForm({
  story,
  authors,
}: {
  story: StoryInit;
  authors: Author[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [meta, setMeta] = useState({
    title: story.title,
    synopsis: story.synopsis,
    genre: story.genre,
    totalMinutes: story.totalMinutes,
    isFree: story.isFree,
    isHot: story.isHot,
    isPremium: story.isPremium,
    isComingSoon: story.isComingSoon,
    hasEbook: story.hasEbook,
  });
  const [coverKey, setCoverKey] = useState<string | null>(story.coverKey);
  const [videoKey, setVideoKey] = useState<string | null>(story.videoKey);
  const [audioKeys, setAudioKeys] = useState<Record<string, string>>(story.audioKeys);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateStory(story.slug, {
        slug: story.slug,
        title: meta.title,
        synopsis: meta.synopsis,
        genre: meta.genre,
        totalMinutes: meta.totalMinutes,
        isFree: meta.isFree,
        isHot: meta.isHot,
        isPremium: meta.isPremium,
        isComingSoon: meta.isComingSoon,
        hasEbook: meta.hasEbook,
        coverKey: coverKey ?? undefined,
        videoKey: videoKey ?? undefined,
        // Strip undefined antes de enviar — partialRecord aceita keys
        // omitidas mas não keys com undefined.
        audioKeyByLocale: Object.fromEntries(
          Object.entries(audioKeys).filter(([, v]) => !!v),
        ),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Apagar "${story.title}" pra sempre? Os arquivos no R2 também são deletados.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteStory(story.slug);
      if (res.ok) {
        router.push('/admin/stories');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleTogglePublish = () => {
    startTransition(async () => {
      const res = meta.isComingSoon
        ? await publishStory(story.slug)
        : await unpublishStory(story.slug);
      if (res.ok) {
        setMeta({ ...meta, isComingSoon: !meta.isComingSoon });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Top metadata grid */}
      <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute mb-4">
          Metadata
        </h3>
        <div className="space-y-4">
          <Field label="Título">
            <input
              className="input"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              maxLength={280}
            />
          </Field>
          <Field label="Sinopse">
            <textarea
              className="input resize-y min-h-[120px]"
              rows={5}
              value={meta.synopsis}
              onChange={(e) => setMeta({ ...meta, synopsis: e.target.value })}
              maxLength={4000}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Gênero">
              <select
                className="input"
                value={meta.genre}
                onChange={(e) => setMeta({ ...meta, genre: e.target.value as Genre })}
              >
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duração (min)">
              <input
                type="number"
                className="input"
                min={1}
                max={600}
                value={meta.totalMinutes}
                onChange={(e) =>
                  setMeta({ ...meta, totalMinutes: parseInt(e.target.value || '45', 10) })
                }
              />
            </Field>
          </div>
          <fieldset className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <Toggle label="Free" checked={meta.isFree} onChange={(v) => setMeta({ ...meta, isFree: v })} />
            <Toggle label="Premium" checked={meta.isPremium} onChange={(v) => setMeta({ ...meta, isPremium: v })} />
            <Toggle label="Hot" checked={meta.isHot} onChange={(v) => setMeta({ ...meta, isHot: v })} />
            <Toggle label="Coming Soon" checked={meta.isComingSoon} onChange={(v) => setMeta({ ...meta, isComingSoon: v })} />
            <Toggle label="Tem ebook" checked={meta.hasEbook} onChange={(v) => setMeta({ ...meta, hasEbook: v })} />
          </fieldset>
        </div>
      </section>

      {/* Assets */}
      <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute mb-4">
          Assets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetSlot
            slug={story.slug}
            kind="cover"
            label="Capa"
            icon={<ImageIcon className="size-4" />}
            currentKey={coverKey}
            previewUrl={story.coverUrl}
            accept="image/*"
            onUploaded={setCoverKey}
          />
          <AssetSlot
            slug={story.slug}
            kind="video"
            label="Vídeo"
            icon={<Video className="size-4" />}
            currentKey={videoKey}
            accept="video/mp4,video/*"
            onUploaded={setVideoKey}
          />
          {LOCALES.map((l) => (
            <AssetSlot
              key={l.id}
              slug={story.slug}
              kind="audio"
              locale={l.id}
              label={`Áudio ${l.label}`}
              icon={<Music className="size-4" />}
              currentKey={audioKeys[l.id] ?? null}
              accept="audio/mpeg,audio/mp3,audio/*"
              onUploaded={(key) =>
                setAudioKeys((prev) => ({ ...prev, [l.id]: key }))
              }
            />
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {savedAt && !error && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300 inline-flex items-center gap-2">
          <Check className="size-4" /> Alterações salvas
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-bg-card/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-3 shadow-2xl shadow-black/40">
        <Button
          variant="glass"
          onClick={handleTogglePublish}
          disabled={pending}
        >
          {meta.isComingSoon ? (
            <>
              <Eye className="size-4" /> Publicar
            </>
          ) : (
            <>
              <EyeOff className="size-4" /> Tirar do ar
            </>
          )}
        </Button>
        <Button variant="rose" onClick={handleSave} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="size-4" /> Salvar alterações
            </>
          )}
        </Button>
      </div>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/[0.25] bg-red-500/[0.04] p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-red-300 mb-2">
          Zona de perigo
        </h3>
        <p className="text-[13px] text-text-dim mb-4">
          Apagar é irreversível. Os arquivos no R2 também são removidos.
        </p>
        <Button variant="glass" onClick={handleDelete} disabled={pending}>
          <Trash2 className="size-4" /> Apagar story
        </Button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------

function AssetSlot({
  slug,
  kind,
  label,
  icon,
  currentKey,
  previewUrl,
  accept,
  onUploaded,
  locale,
}: {
  slug: string;
  kind: UploadKind;
  label: string;
  icon: React.ReactNode;
  currentKey: string | null;
  previewUrl?: string;
  accept: string;
  onUploaded: (key: string) => void;
  locale?: 'en' | 'de' | 'fr' | 'es';
}) {
  const upload = useMultipartUpload();
  // pickingNew força o picker mesmo quando ainda existe um asset salvo.
  // Sem isso, clicar Substituir não fazia nada visualmente — o card
  // verde voltava porque `currentKey` continuava preenchido.
  const [pickingNew, setPickingNew] = useState(false);
  const isUploading = ['requesting', 'uploading', 'completing'].includes(upload.status);
  const showSuccess = !!currentKey && !pickingNew && !isUploading;
  const showPicker = !showSuccess && !isUploading;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPickingNew(false);
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

  return (
    <div className="rounded-xl bg-bg-elevated border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="size-6 rounded-md bg-rose/15 text-rose-bright grid place-items-center">
          {icon}
        </span>
        <span className="text-[13px] font-bold text-white flex-1">{label}</span>
        {currentKey && !isUploading && (
          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
            ✓
          </span>
        )}
      </div>

      {kind === 'cover' && previewUrl && !isUploading && (
        <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-bg-deep">
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="300px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {currentKey && (
        <p className="text-[10px] font-mono text-text-mute break-all mb-3 line-clamp-2">
          {currentKey}
        </p>
      )}

      {isUploading ? (
        <div>
          <p className="text-[12px] text-white mb-2">
            {Math.round(upload.progress * 100)}% ·{' '}
            {(upload.uploadedBytes / 1024 / 1024).toFixed(1)} MB
          </p>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-rose-bright transition-all"
              style={{ width: `${upload.progress * 100}%` }}
            />
          </div>
        </div>
      ) : showPicker ? (
        <label className="block cursor-pointer text-center py-3 px-3 rounded-lg border border-dashed border-white/[0.10] hover:border-rose-bright/50 hover:bg-rose/[0.03] transition-colors">
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <span className="text-[12px] text-rose-bright font-semibold">
            {pickingNew ? 'Escolher novo arquivo' : 'Escolher arquivo'}
          </span>
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setPickingNew(true)}
          className="text-[12px] text-rose-bright hover:text-rose font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="size-3.5" /> Substituir
        </button>
      )}
      {upload.status === 'error' && upload.error && (
        <p className="text-[11px] text-red-400 mt-2">{upload.error}</p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-text-mute mb-1.5">
        {label}
      </span>
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
          : 'bg-bg-deep border-white/[0.06] text-text-dim hover:border-white/[0.15]',
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
