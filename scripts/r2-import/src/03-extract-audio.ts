// 03-extract-audio.ts — extrai áudio MP3 dos vídeos com ffmpeg.
// Concorrência: 3 ffmpegs simultâneos (CPU bound).
// Idempotente: pula se output já existe e tem tamanho > 0.
// Magnata: copia os MP3 que já existem (não re-encoda).

import { spawn } from 'node:child_process';
import { existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { AUDIO_OUT, ensureDirs } from './lib/config.ts';
import { readManifest, writeManifest, type Locale, type StoryEntry } from './lib/manifest.ts';
import { runPool } from './lib/pool.ts';

type Job = {
  storyKey: string; // 'free-<num>' or 'magnata'
  num: number;
  lang: Locale;
  inputPath: string;
  outputPath: string;
  isCopy: boolean; // for Magnata, the audio is already MP3 — copy verbatim
  story: StoryEntry;
};

function ffmpeg(input: string, output: string): Promise<void> {
  return new Promise((res, rej) => {
    mkdirSync(dirname(output), { recursive: true });
    const args = [
      '-y',
      '-i',
      input,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-b:a',
      '128k',
      '-ac',
      '2',
      '-ar',
      '44100',
      '-loglevel',
      'error',
      output,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', rej);
    proc.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`ffmpeg exit ${code} on ${input}`));
    });
  });
}

function buildJobs(manifest: ReturnType<typeof readManifest>): Job[] {
  if (!manifest) return [];
  const jobs: Job[] = [];

  for (const story of manifest.stories) {
    for (const lang of ['en', 'de', 'fr', 'es'] as Locale[]) {
      const src = story.sources[lang];
      if (!src) continue;
      const outputPath = resolve(AUDIO_OUT, String(story.num), `audio-${lang}.mp3`);
      const exists = existsSync(outputPath) && statSync(outputPath).size > 0;
      if (exists && story.audioExtracted?.[lang]) continue;
      jobs.push({
        storyKey: `free-${story.num}`,
        num: story.num,
        lang,
        inputPath: src.mp4,
        outputPath,
        isCopy: false,
        story,
      });
    }
  }

  // Magnata — copy pre-existing MP3s instead of extracting
  if (manifest.magnata) {
    const m = manifest.magnata;
    const pre = (m.sources as Record<string, unknown>).preExistingAudios as
      | Partial<Record<Locale, string>>
      | undefined;
    if (pre) {
      for (const lang of ['en', 'de', 'fr', 'es'] as Locale[]) {
        const sourcePath = pre[lang];
        if (!sourcePath) continue;
        const outputPath = resolve(AUDIO_OUT, 'magnata', `audio-${lang}.mp3`);
        const exists = existsSync(outputPath) && statSync(outputPath).size > 0;
        if (exists && m.audioExtracted?.[lang]) continue;
        jobs.push({
          storyKey: 'magnata',
          num: 0,
          lang,
          inputPath: sourcePath,
          outputPath,
          isCopy: true,
          story: m,
        });
      }
    }
  }

  return jobs;
}

async function main(): Promise<void> {
  ensureDirs();
  const manifest = readManifest();
  if (!manifest) {
    console.error('No manifest — run 02-scan-and-slug first');
    process.exit(1);
  }

  console.log('=== 03-extract-audio starting ===');
  const jobs = buildJobs(manifest);
  console.log(`Jobs: ${jobs.length} audio files to produce`);
  if (jobs.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let done = 0;
  let failed = 0;

  await runPool(jobs, 3, async (job) => {
    const label = `[${job.storyKey} ${job.lang}]`;
    const start = Date.now();
    try {
      if (job.isCopy) {
        mkdirSync(dirname(job.outputPath), { recursive: true });
        copyFileSync(job.inputPath, job.outputPath);
      } else {
        await ffmpeg(job.inputPath, job.outputPath);
      }
      const sizeMb = (statSync(job.outputPath).size / 1024 / 1024).toFixed(1);
      console.log(`${label} done ${sizeMb} MB in ${((Date.now() - start) / 1000).toFixed(1)}s`);

      // Update manifest immediately so partial progress is preserved on crash
      job.story.audioExtracted = { ...(job.story.audioExtracted ?? {}), [job.lang]: true };
      done++;
      writeManifest(manifest);
    } catch (err) {
      failed++;
      console.error(`${label} FAILED:`, err);
      job.story.errors = [...(job.story.errors ?? []), `audio-${job.lang}: ${String(err)}`];
      writeManifest(manifest);
    }
  });

  // Mark stories that have all expected audios extracted
  for (const s of manifest.stories) {
    const expected = Object.keys(s.targets.audioKeys) as Locale[];
    if (expected.length > 0 && expected.every((l) => s.audioExtracted?.[l])) {
      s.status = 'audio-extracted';
    }
  }
  if (manifest.magnata) {
    const m = manifest.magnata;
    const expected = Object.keys(m.targets.audioKeys) as Locale[];
    if (expected.length > 0 && expected.every((l) => m.audioExtracted?.[l])) {
      m.status = 'audio-extracted';
    }
  }
  writeManifest(manifest);

  console.log(`=== 03-extract-audio done === produced=${done} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
