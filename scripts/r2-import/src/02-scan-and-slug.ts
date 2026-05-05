// 02-scan-and-slug.ts — varre _workspace/extracted/, identifica histórias por número,
// gera slug + genre + tropes, escreve manifest.json.
// Idempotente: faz merge com manifest existente preservando edições manuais.

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  ensureDirs,
  EXTRACTED,
  SOURCES,
} from './lib/config.ts';
import {
  emptyManifest,
  mergeStory,
  readManifest,
  writeManifest,
  type Locale,
  type SourceFile,
  type StoryEntry,
  type Manifest,
} from './lib/manifest.ts';
import { detectGenreAndTropes, type Genre } from './lib/genre.ts';
import { makeSlug } from './lib/slug.ts';

const LANGS_FREE: Locale[] = ['en', 'de', 'fr'];

const COVER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Find a single story <num> folder's assets. */
function inspectStoryFolder(dir: string, num: number): SourceFile | null {
  if (!existsSync(dir)) return null;
  const items = readdirSync(dir);

  // Video: prefer descriptive .mp4 (skip generic videoplayback if descriptive exists)
  const mp4s = items.filter((f) => f.toLowerCase().endsWith('.mp4'));
  if (mp4s.length === 0) return null;
  const descriptive = mp4s.find((f) => !/^videoplayback/i.test(f));
  const mp4Name = descriptive ?? mp4s[0];
  const mp4Path = join(dir, mp4Name);
  const videoBytes = statSync(mp4Path).size;

  // Cover: prefer <num>-capa.<ext>; fallback maxresdefault.<ext>
  let cover: string | null = null;
  const numPrefix = `${num}-capa`;
  for (const ext of COVER_EXTS) {
    const candidate = items.find((f) => f.toLowerCase() === `${numPrefix}${ext}`);
    if (candidate) {
      cover = join(dir, candidate);
      break;
    }
  }
  if (!cover) {
    const fallback = items.find((f) => /^maxresdefault.*\.(jpg|jpeg|png|webp)$/i.test(f));
    if (fallback) cover = join(dir, fallback);
  }
  // Fallback: any image
  if (!cover) {
    const anyImage = items.find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (anyImage) cover = join(dir, anyImage);
  }

  // Text file: variants like "5- Titulo e descrição.txt", "5-titulo e descrição.txt",
  // "5 - Titulo e descrição.txt". Tolerate accents/case/whitespace.
  const txt = items.find((f) => {
    const norm = f.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (!norm.endsWith('.txt')) return false;
    const numPattern = new RegExp(`^${num}\\s*-\\s*titulo\\s+e\\s+descricao`);
    return numPattern.test(norm);
  });
  const textPath = txt ? join(dir, txt) : null;

  return { mp4: mp4Path, cover, textPath, videoBytes };
}

function readTextFile(path: string | null): { title: string; synopsis: string } {
  if (!path || !existsSync(path)) return { title: '', synopsis: '' };
  const raw = readFileSync(path, 'utf-8').trim();
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: '', synopsis: '' };
  const title = lines[0];
  const synopsis = lines.slice(1).join(' ').trim();
  return { title, synopsis };
}

function scanLanguage(lang: Locale): Map<number, SourceFile> {
  const dir = resolve(EXTRACTED, lang);
  if (!existsSync(dir)) {
    console.log(`[scan] ${lang}: extracted dir missing`);
    return new Map();
  }

  // Recursively descend until we find numbered folders. Drive splits its zips with
  // an outer "INGLES/" or similar wrapper, so we may need to look one level deep.
  const out = new Map<number, SourceFile>();

  const visit = (folder: string, depth: number): void => {
    if (depth > 4) return; // safety
    const entries = readdirSync(folder);
    for (const entry of entries) {
      const fullPath = join(folder, entry);
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) continue;
      const numMatch = /^(\d+)$/.exec(entry);
      if (numMatch) {
        const num = Number(numMatch[1]);
        const info = inspectStoryFolder(fullPath, num);
        if (info) out.set(num, info);
      } else {
        // Wrapper folder (e.g. "INGLES" inside the extracted root) — descend
        visit(fullPath, depth + 1);
      }
    }
  };
  visit(dir, 0);

  console.log(`[scan] ${lang}: ${out.size} stories with media`);
  return out;
}

function inspectMagnata(): StoryEntry | null {
  const dir = SOURCES.magnata;
  if (!existsSync(dir)) {
    console.log('[scan] magnata: source folder missing');
    return null;
  }
  const items = readdirSync(dir);

  const mp4 = items.find((f) => f.toLowerCase().endsWith('.mp4'));
  const cover = items.find((f) => /capa\.(jpg|jpeg|png|webp)$/i.test(f));
  const textPath = items.find((f) => /titulo e descri[cç][aã]o/i.test(f));

  if (!mp4 || !textPath) {
    console.log('[scan] magnata: missing required files');
    return null;
  }

  const mp4Path = join(dir, mp4);
  const text = readTextFile(join(dir, textPath));

  // Audios live in AUDIOS/ subfolder; map by language hint in filename
  const audiosDir = join(dir, 'AUDIOS');
  const audios: Partial<Record<Locale, string>> = {};
  if (existsSync(audiosDir)) {
    for (const file of readdirSync(audiosDir)) {
      const f = file.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!f.endsWith('.mp3')) continue;
      const fullPath = join(audiosDir, file);
      if (f.includes('ingles')) audios.en = fullPath;
      else if (f.includes('alemao') || f.includes('aleman')) audios.de = fullPath;
      else if (f.includes('frances') || f.includes('francais')) audios.fr = fullPath;
      else if (f.includes('espanhol') || f.includes('spanish')) audios.es = fullPath;
    }
  }

  const slug = 'magnata';
  const prefix = `premium/${slug}/book1`;
  const detected = detectGenreAndTropes(text.title, text.synopsis);

  const entry: StoryEntry = {
    num: 0,
    slug,
    title: text.title,
    synopsis: text.synopsis,
    genre: 'billionaire',
    tropes: ['billionaire', 'revenge', 'forbidden love'],
    isFree: false,
    _autoDetected: { genre: false, tropes: false }, // hand-set above
    sources: {
      en: {
        mp4: mp4Path,
        cover: cover ? join(dir, cover) : null,
        textPath: join(dir, textPath),
        videoBytes: statSync(mp4Path).size,
      },
    },
    targets: {
      videoKey: `${prefix}/video.mp4`,
      coverKey: `${prefix}/cover.jpg`,
      audioKeys: {
        en: audios.en ? `${prefix}/audio-en.mp3` : undefined,
        de: audios.de ? `${prefix}/audio-de.mp3` : undefined,
        fr: audios.fr ? `${prefix}/audio-fr.mp3` : undefined,
        es: audios.es ? `${prefix}/audio-es.mp3` : undefined,
      },
    },
    audioExtracted: {
      en: !!audios.en,
      de: !!audios.de,
      fr: !!audios.fr,
      es: !!audios.es,
    },
    status: 'scanned',
  };

  // Stash the audio source paths in the SourceFile so 03-extract-audio knows to copy them
  // verbatim instead of re-encoding from video.
  entry.sources.en!.cover = cover ? join(dir, cover) : null;
  // We need a way to remember pre-existing audio paths. Use a side field on sources.
  (entry.sources as Record<string, unknown>).preExistingAudios = audios;

  // We accept the detected genre as informational; magnata genre is set explicitly above.
  void detected;
  return entry;
}

function main(): void {
  ensureDirs();
  console.log('=== 02-scan-and-slug starting ===');

  const byLang: Record<Locale, Map<number, SourceFile>> = {
    en: scanLanguage('en'),
    de: scanLanguage('de'),
    fr: scanLanguage('fr'),
    es: new Map(),
  };

  // Union of all numbers across languages
  const allNums = new Set<number>();
  for (const lang of LANGS_FREE) {
    for (const num of byLang[lang].keys()) allNums.add(num);
  }
  const nums = [...allNums].sort((a, b) => a - b);
  console.log(`[scan] ${nums.length} unique story numbers across languages`);

  // Slug allocation in deterministic order — earliest num wins on collisions
  const taken = new Set<string>();
  const stories: StoryEntry[] = [];
  for (const num of nums) {
    // Title source: prefer EN; fall back DE → FR
    const enInfo = byLang.en.get(num);
    const deInfo = byLang.de.get(num);
    const frInfo = byLang.fr.get(num);

    const titleText = readTextFile(
      enInfo?.textPath ?? deInfo?.textPath ?? frInfo?.textPath ?? null,
    );
    const title = titleText.title || `Story ${num}`;
    const synopsis = titleText.synopsis;

    const slug = makeSlug(title, num, taken);
    taken.add(slug);

    const detected = detectGenreAndTropes(title, synopsis);
    const prefix = `stories/${slug}/book1`;

    const sources: Partial<Record<Locale, SourceFile>> = {};
    if (enInfo) sources.en = enInfo;
    if (deInfo) sources.de = deInfo;
    if (frInfo) sources.fr = frInfo;

    const audioKeys: Partial<Record<Locale, string>> = {};
    if (enInfo) audioKeys.en = `${prefix}/audio-en.mp3`;
    if (deInfo) audioKeys.de = `${prefix}/audio-de.mp3`;
    if (frInfo) audioKeys.fr = `${prefix}/audio-fr.mp3`;

    const entry: StoryEntry = {
      num,
      slug,
      title,
      synopsis,
      genre: detected.genre,
      tropes: detected.tropes,
      isFree: true,
      _autoDetected: { genre: true, tropes: true },
      sources,
      targets: {
        videoKey: `${prefix}/video.mp4`,
        coverKey: `${prefix}/cover.jpg`,
        audioKeys,
      },
      status: 'scanned',
    };
    stories.push(entry);
  }

  // Magnata
  const magnata = inspectMagnata();

  // Merge with previous manifest if present, preserving manual edits
  const prev = readManifest();
  const next: Manifest = prev ?? emptyManifest();
  next.stories = stories.map((s) => mergeStory(prev?.stories.find((p) => p.num === s.num), s));
  if (magnata) next.magnata = mergeStory(prev?.magnata, magnata);

  writeManifest(next);
  console.log(`=== 02-scan-and-slug done ===`);
  console.log(`Stories: ${next.stories.length} (free) + ${next.magnata ? 1 : 0} (premium magnata)`);
  console.log(`Manifest: ${nums.slice(0, 5).join(', ')}... full breakdown by genre:`);
  const byGenre: Record<string, number> = {};
  for (const s of next.stories) byGenre[s.genre] = (byGenre[s.genre] ?? 0) + 1;
  for (const [g, c] of Object.entries(byGenre).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g}: ${c}`);
  }
}

try {
  main();
} catch (err) {
  console.error('FAILED:', err);
  process.exit(1);
}
