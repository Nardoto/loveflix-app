// 04-upload-r2.ts — sobe vídeos, áudios e capas pro bucket R2.
// Concorrência: 2 histórias em paralelo.
// Idempotente via headObject + state markers.
// Reutiliza lib/r2.ts do projeto Next (S3 client compartilhado).

import { createReadStream, statSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { AUDIO_OUT, STATE_DIR, ensureDirs, requireEnv } from './lib/config.ts';
import { readManifest, writeManifest, type Locale, type StoryEntry } from './lib/manifest.ts';
import { runPool } from './lib/pool.ts';

const SIZE_TOLERANCE = 0.01; // 1%
const MIN_MULTIPART_SIZE = 100 * 1024 * 1024; // 100 MB → multipart; smaller goes single PUT
const PART_SIZE = 16 * 1024 * 1024; // 16 MB
const PART_CONCURRENCY = 4;
const STORY_CONCURRENCY = 2;

function buildClient(): { s3: S3Client; bucket: string } {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = process.env.R2_BUCKET_NAME || 'alluretv-media';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { s3, bucket };
}

function stateFile(key: string): string {
  return resolve(STATE_DIR, `${createHash('sha1').update(key).digest('hex')}.done`);
}

async function exists(s3: S3Client, bucket: string, key: string, expectedBytes?: number): Promise<boolean> {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (typeof expectedBytes !== 'number') return true;
    const size = r.ContentLength ?? 0;
    if (Math.abs(size - expectedBytes) / expectedBytes <= SIZE_TOLERANCE) return true;
    console.log(`[skip-conflict] ${key}: size mismatch (R2=${size}, local=${expectedBytes})`);
    return false;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'NotFound') return false;
    throw err;
  }
}

function contentTypeFor(key: string): string {
  if (key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.mp3')) return 'audio/mpeg';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function uploadOne(
  s3: S3Client,
  bucket: string,
  filePath: string,
  key: string,
): Promise<void> {
  const size = statSync(filePath).size;

  // Skip if already uploaded
  if (existsSync(stateFile(key))) {
    console.log(`[skip-state] ${key}`);
    return;
  }
  if (await exists(s3, bucket, key, size)) {
    writeFileSync(stateFile(key), `${new Date().toISOString()} ${size}\n`);
    console.log(`[skip-r2] ${key}`);
    return;
  }

  const start = Date.now();
  const sizeMb = (size / 1024 / 1024).toFixed(1);
  console.log(`[start] ${key} (${sizeMb} MB)`);

  if (size < MIN_MULTIPART_SIZE) {
    // Single-shot PUT
    const { readFileSync } = await import('node:fs');
    const body = readFileSync(filePath); // small enough to buffer
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFor(key),
        ContentLength: size,
      }),
    );
  } else {
    // Multipart via @aws-sdk/lib-storage Upload helper
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentTypeFor(key),
      },
      partSize: PART_SIZE,
      queueSize: PART_CONCURRENCY,
      leavePartsOnError: false,
    });
    upload.on('httpUploadProgress', (p) => {
      const pct = p.loaded && p.total ? ((p.loaded / p.total) * 100).toFixed(0) : '?';
      // throttle stdout: only log multiples of 25
      if (p.loaded && p.total) {
        const intPct = (p.loaded / p.total) * 100;
        if (intPct >= 25 && intPct < 26) console.log(`  ${key}: 25%`);
        else if (intPct >= 50 && intPct < 51) console.log(`  ${key}: 50%`);
        else if (intPct >= 75 && intPct < 76) console.log(`  ${key}: 75%`);
      }
      void pct;
    });
    await upload.done();
  }

  writeFileSync(stateFile(key), `${new Date().toISOString()} ${size}\n`);
  console.log(`[done]  ${key} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function uploadStory(
  s3: S3Client,
  bucket: string,
  story: StoryEntry,
  audioBaseDir: string,
): Promise<void> {
  // Cover (use EN's cover; fall back to any locale that has one)
  const coverPath =
    story.sources.en?.cover ?? story.sources.de?.cover ?? story.sources.fr?.cover ?? null;
  if (coverPath) {
    await uploadOne(s3, bucket, coverPath, story.targets.coverKey);
  }

  // Video — use EN as the "master" for free stories; magnata uses its EN source
  const masterVideo =
    story.sources.en?.mp4 ?? story.sources.de?.mp4 ?? story.sources.fr?.mp4 ?? null;
  if (masterVideo) {
    await uploadOne(s3, bucket, masterVideo, story.targets.videoKey);
  }

  // Audio files
  for (const lang of ['en', 'de', 'fr', 'es'] as Locale[]) {
    const audioKey = story.targets.audioKeys[lang];
    if (!audioKey) continue;
    const audioPath = resolve(audioBaseDir, `audio-${lang}.mp3`);
    if (!existsSync(audioPath)) {
      console.log(`[warn] missing local audio ${audioPath}`);
      continue;
    }
    await uploadOne(s3, bucket, audioPath, audioKey);
    story.uploaded = { ...(story.uploaded ?? {}), [audioKey]: true };
  }

  // Update story-level upload markers
  story.uploaded = { ...(story.uploaded ?? {}), [story.targets.coverKey]: true, [story.targets.videoKey]: true };
  story.status = 'uploaded';
}

async function main(): Promise<void> {
  ensureDirs();
  const manifest = readManifest();
  if (!manifest) {
    console.error('No manifest — run 02-scan-and-slug first');
    process.exit(1);
  }
  const { s3, bucket } = buildClient();
  console.log(`=== 04-upload-r2 starting === bucket=${bucket}`);

  // Filter: only stories with audio-extracted status (or already uploaded — to retry)
  const candidates = manifest.stories.filter((s) =>
    s.status === 'audio-extracted' || s.status === 'uploading' || s.status === 'uploaded',
  );
  console.log(`Stories ready to upload: ${candidates.length}`);

  let success = 0;
  let failed = 0;

  await runPool(candidates, STORY_CONCURRENCY, async (story) => {
    const label = `[story-${story.num} ${story.slug}]`;
    const audioDir = resolve(AUDIO_OUT, String(story.num));
    try {
      story.status = 'uploading';
      writeManifest(manifest);
      await uploadStory(s3, bucket, story, audioDir);
      success++;
      writeManifest(manifest);
      console.log(`${label} OK`);
    } catch (err) {
      failed++;
      story.status = 'failed';
      story.errors = [...(story.errors ?? []), `upload: ${String(err)}`];
      writeManifest(manifest);
      console.error(`${label} FAILED:`, err);
    }
  });

  // Magnata
  if (manifest.magnata && (manifest.magnata.status === 'audio-extracted' || manifest.magnata.status === 'uploading' || manifest.magnata.status === 'uploaded')) {
    const m = manifest.magnata;
    const audioDir = resolve(AUDIO_OUT, 'magnata');
    try {
      m.status = 'uploading';
      writeManifest(manifest);
      await uploadStory(s3, bucket, m, audioDir);
      writeManifest(manifest);
      console.log('[magnata] OK');
      success++;
    } catch (err) {
      m.status = 'failed';
      m.errors = [...(m.errors ?? []), `upload: ${String(err)}`];
      writeManifest(manifest);
      console.error('[magnata] FAILED:', err);
      failed++;
    }
  }

  console.log(`=== 04-upload-r2 done === success=${success} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
