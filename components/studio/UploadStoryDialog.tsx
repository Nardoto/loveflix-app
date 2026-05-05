'use client';

import { useRef, useState } from 'react';
import { Plus, Upload, CheckCircle2, AlertTriangle, Film, Headphones, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { uploadToR2, type AssetKind } from '@/lib/upload/r2-multipart';
import { cn } from '@/lib/utils';

type Locale = 'en' | 'de' | 'fr' | 'es';
const AUDIO_LOCALES: Locale[] = ['en', 'de', 'fr', 'es'];

type SlotState =
  | { status: 'idle'; file: File | null }
  | { status: 'uploading'; file: File; percent: number }
  | { status: 'done'; file: File; key: string }
  | { status: 'error'; file: File; message: string };

type Slots = {
  cover: SlotState;
  video: SlotState;
  audios: Record<Locale, SlotState>;
};

const idle: SlotState = { status: 'idle', file: null };

const initialSlots = (): Slots => ({
  cover: { ...idle },
  video: { ...idle },
  audios: {
    en: { ...idle },
    de: { ...idle },
    fr: { ...idle },
    es: { ...idle },
  },
});

const slugRegex = /^[a-z0-9-]+$/;

export function UploadStoryDialog() {
  const [open, setOpen] = useState(false);
  const [storySlug, setStorySlug] = useState('');
  const [bookNumber, setBookNumber] = useState(1);
  const [slots, setSlots] = useState<Slots>(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStorySlug('');
    setBookNumber(1);
    setSlots(initialSlots());
    setSubmitting(false);
  };

  const setSlot = (key: 'cover' | 'video', state: SlotState) =>
    setSlots((prev) => ({ ...prev, [key]: state }));

  const setAudioSlot = (locale: Locale, state: SlotState) =>
    setSlots((prev) => ({ ...prev, audios: { ...prev.audios, [locale]: state } }));

  const slugValid = slugRegex.test(storySlug);
  const hasAnyFile =
    slots.video.file !== null ||
    slots.cover.file !== null ||
    AUDIO_LOCALES.some((l) => slots.audios[l].file !== null);
  const canSubmit = slugValid && bookNumber >= 1 && hasAnyFile && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    type Job = {
      kind: AssetKind;
      locale?: Locale;
      file: File;
      apply: (s: SlotState) => void;
    };
    const jobs: Job[] = [];
    if (slots.cover.file) {
      jobs.push({
        kind: 'cover',
        file: slots.cover.file,
        apply: (s) => setSlot('cover', s),
      });
    }
    if (slots.video.file) {
      jobs.push({
        kind: 'video',
        file: slots.video.file,
        apply: (s) => setSlot('video', s),
      });
    }
    for (const loc of AUDIO_LOCALES) {
      const f = slots.audios[loc].file;
      if (f) {
        jobs.push({
          kind: 'audio',
          locale: loc,
          file: f,
          apply: (s) => setAudioSlot(loc, s),
        });
      }
    }

    // Run jobs sequentially. Each job is internally chunked + parallel,
    // but stacking 6 concurrent multipart uploads from the browser is wasteful.
    for (const job of jobs) {
      job.apply({ status: 'uploading', file: job.file, percent: 0 });
      try {
        const res = await uploadToR2(
          job.file,
          {
            storySlug,
            bookNumber,
            kind: job.kind,
            locale: job.locale,
            filename: job.file.name,
          },
          {
            signal,
            onProgress: (p) =>
              job.apply({ status: 'uploading', file: job.file, percent: p.percent }),
          },
        );
        job.apply({ status: 'done', file: job.file, key: res.key });
      } catch (err) {
        job.apply({
          status: 'error',
          file: job.file,
          message: err instanceof Error ? err.message : String(err),
        });
        // Stop on first failure — partial uploads can be retried by reopening the dialog.
        break;
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return; // prevent closing mid-upload
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="rose" size="lg">
          <Plus /> New Story
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogTitle>Upload story media</DialogTitle>
        <DialogDescription>
          All files go to Cloudflare R2 (`stories/{'{slug}'}/book{'{N}'}/...`). Upload only what you have —
          you can come back and add audio tracks later.
        </DialogDescription>

        {/* Metadata */}
        <div className="grid sm:grid-cols-[1fr_120px] gap-3 mt-4">
          <Field label="Story slug" hint="lowercase, dashes only — must match the catalog row">
            <input
              type="text"
              value={storySlug}
              onChange={(e) => setStorySlug(e.target.value.trim())}
              placeholder="he-had-never-touched-me"
              className={cn(
                'w-full h-11 px-4 rounded-xl bg-black/40 text-white outline-none border',
                slugValid || storySlug === '' ? 'border-white/10' : 'border-rose',
              )}
              disabled={submitting}
            />
          </Field>
          <Field label="Book #">
            <input
              type="number"
              min={1}
              max={99}
              value={bookNumber}
              onChange={(e) => setBookNumber(Number(e.target.value) || 1)}
              className="w-full h-11 px-4 rounded-xl bg-black/40 text-white outline-none border border-white/10"
              disabled={submitting}
            />
          </Field>
        </div>

        {/* Files */}
        <div className="space-y-3 mt-2">
          <FileSlot
            icon={<ImageIcon />}
            title="Cover image"
            hint="JPG/PNG · 1920×1080+ recommended"
            accept="image/*"
            slot={slots.cover}
            onPick={(file) => setSlot('cover', { status: 'idle', file })}
            disabled={submitting}
          />
          <FileSlot
            icon={<Film />}
            title="Video (MP4)"
            hint="Single MP4 — image+audio is fine. 500 MB+ supported."
            accept="video/mp4,video/x-matroska,video/quicktime"
            slot={slots.video}
            onPick={(file) => setSlot('video', { status: 'idle', file })}
            disabled={submitting}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {AUDIO_LOCALES.map((loc) => (
              <FileSlot
                key={loc}
                compact
                icon={<Headphones />}
                title={`Audio · ${loc.toUpperCase()}`}
                hint="MP3 · narration in this language"
                accept="audio/mpeg,audio/mp3"
                slot={slots.audios[loc]}
                onPick={(file) => setAudioSlot(loc, { status: 'idle', file })}
                disabled={submitting}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-white/10">
          {submitting ? (
            <Button
              variant="ghost"
              onClick={() => abortRef.current?.abort()}
              type="button"
            >
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setOpen(false)} type="button">
              Close
            </Button>
          )}
          <Button variant="rose" onClick={submit} disabled={!canSubmit}>
            <Upload /> {submitting ? 'Uploading…' : 'Start upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
      <span className="block text-[10px] font-bold uppercase tracking-widest text-text-mute mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-text-dim mt-1">{hint}</span>}
    </label>
  );
}

function FileSlot({
  icon,
  title,
  hint,
  accept,
  slot,
  onPick,
  disabled,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  accept: string;
  slot: SlotState;
  onPick: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const file = slot.file;
  const sizeLabel = file ? formatBytes(file.size) : null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-black/30 p-4 flex items-start gap-3',
        compact && 'p-3',
      )}
    >
      <div className="size-10 rounded-xl bg-rose/10 text-rose-bright grid place-items-center [&_svg]:size-5 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-white truncate">{title}</p>
          {slot.status === 'done' && <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />}
          {slot.status === 'error' && <AlertTriangle className="size-4 text-rose-bright shrink-0" />}
        </div>
        {file ? (
          <p className="text-xs text-text-dim truncate mt-0.5">
            {file.name} · {sizeLabel}
          </p>
        ) : (
          <p className="text-xs text-text-dim mt-0.5">{hint}</p>
        )}

        {slot.status === 'uploading' && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-rose transition-all"
                style={{ width: `${slot.percent}%` }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-text-mute mt-1">
              {slot.percent}%
            </p>
          </div>
        )}
        {slot.status === 'error' && (
          <p className="text-xs text-rose-bright mt-1 break-words">{slot.message}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={disabled || slot.status === 'uploading'}
            onClick={() => inputRef.current?.click()}
          >
            {file ? 'Replace' : 'Choose file'}
          </Button>
          {file && slot.status !== 'uploading' && slot.status !== 'done' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onPick(null)}
            >
              <X /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
