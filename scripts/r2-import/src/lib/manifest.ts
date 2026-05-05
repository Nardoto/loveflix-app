// Manifest is the canonical source of truth across pipeline stages.
// Each stage reads it, mutates the relevant fields, and writes it back atomically.

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { MANIFEST_PATH } from './config.ts';
import type { Genre } from './genre.ts';

export type Locale = 'en' | 'de' | 'fr' | 'es';

export type SourceFile = {
  mp4: string;            // absolute path to the source MP4
  cover: string | null;   // absolute path to the cover image (jpg/png/webp)
  textPath: string | null; // absolute path to <num>-titulo e descrição.txt
  videoBytes: number;
};

export type StoryEntry = {
  num: number;
  slug: string;
  title: string;
  synopsis: string;
  genre: Genre;
  tropes: string[];
  isFree: boolean;
  /** Set true only for genre/tropes auto-detected — preserved across re-runs. */
  _autoDetected?: { genre?: boolean; tropes?: boolean };

  sources: Partial<Record<Locale, SourceFile>>;

  targets: {
    videoKey: string;            // stories/<slug>/book1/video.mp4
    coverKey: string;            // stories/<slug>/book1/cover.jpg
    audioKeys: Partial<Record<Locale, string>>;
  };

  audioExtracted?: Partial<Record<Locale, boolean>>;
  uploaded?: Partial<Record<string, boolean>>; // keyed by R2 object key

  status: 'scanned' | 'audio-extracted' | 'uploading' | 'uploaded' | 'validated' | 'failed';
  errors?: string[];
};

export type Manifest = {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  stories: StoryEntry[];
  magnata?: StoryEntry; // Premium track, separate prefix
};

export function readManifest(): Manifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export function writeManifest(m: Manifest): void {
  m.updatedAt = new Date().toISOString();
  // Atomic write: tmp file → rename. Avoids corruption if killed mid-write.
  const tmpPath = resolve(dirname(MANIFEST_PATH), `.manifest.${process.pid}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(m, null, 2), 'utf-8');
  renameSync(tmpPath, MANIFEST_PATH);
}

export function emptyManifest(): Manifest {
  const now = new Date().toISOString();
  return { schemaVersion: 1, createdAt: now, updatedAt: now, stories: [] };
}

/**
 * Deep merge keeping user-edited fields. Used by 02-scan when the manifest
 * already exists from a previous run.
 */
export function mergeStory(prev: StoryEntry | undefined, next: StoryEntry): StoryEntry {
  if (!prev) return next;
  return {
    ...next,
    // Preserve user edits if they were not auto-detected
    genre: prev._autoDetected?.genre ? next.genre : prev.genre,
    tropes: prev._autoDetected?.tropes ? next.tropes : prev.tropes,
    // Carry forward state
    status: prev.status,
    audioExtracted: prev.audioExtracted,
    uploaded: prev.uploaded,
    errors: prev.errors,
  };
}
