// 05-validate.ts — verifica via headObject que todos os keys esperados estão no R2
// e que os tamanhos batem (±1%) com a fonte local.
// Exit 0 se tudo OK. Exit 1 se houver MISSING ou SIZE_MISMATCH.

import { statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { AUDIO_OUT, requireEnv } from './lib/config.ts';
import { readManifest, type Locale, type StoryEntry } from './lib/manifest.ts';

const SIZE_TOLERANCE = 0.01;

type Check = { key: string; localBytes: number };

function buildChecks(story: StoryEntry, audioBaseDir: string): Check[] {
  const checks: Check[] = [];

  const coverPath =
    story.sources.en?.cover ?? story.sources.de?.cover ?? story.sources.fr?.cover ?? null;
  if (coverPath) checks.push({ key: story.targets.coverKey, localBytes: statSync(coverPath).size });

  const masterVideo =
    story.sources.en?.mp4 ?? story.sources.de?.mp4 ?? story.sources.fr?.mp4 ?? null;
  if (masterVideo) checks.push({ key: story.targets.videoKey, localBytes: statSync(masterVideo).size });

  for (const lang of ['en', 'de', 'fr', 'es'] as Locale[]) {
    const audioKey = story.targets.audioKeys[lang];
    if (!audioKey) continue;
    const path = resolve(audioBaseDir, `audio-${lang}.mp3`);
    if (existsSync(path)) checks.push({ key: audioKey, localBytes: statSync(path).size });
    else checks.push({ key: audioKey, localBytes: -1 }); // local missing → still verify R2 has it
  }
  return checks;
}

async function main(): Promise<void> {
  const manifest = readManifest();
  if (!manifest) {
    console.error('No manifest');
    process.exit(1);
  }
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const bucket = process.env.R2_BUCKET_NAME || 'alluretv-media';
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  console.log(`=== 05-validate starting === bucket=${bucket}`);

  type Result = 'OK' | 'MISSING' | 'SIZE_MISMATCH';
  const results: Array<{ key: string; result: Result; details?: string }> = [];

  const allStories: Array<{ s: StoryEntry; audioBase: string }> = [
    ...manifest.stories.map((s) => ({ s, audioBase: resolve(AUDIO_OUT, String(s.num)) })),
  ];
  if (manifest.magnata) allStories.push({ s: manifest.magnata, audioBase: resolve(AUDIO_OUT, 'magnata') });

  let total = 0;
  for (const { s, audioBase } of allStories) {
    const checks = buildChecks(s, audioBase);
    for (const c of checks) {
      total++;
      try {
        const r = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: c.key }));
        const r2Bytes = r.ContentLength ?? 0;
        if (c.localBytes < 0) {
          results.push({ key: c.key, result: 'OK', details: `R2 size=${r2Bytes}, local missing (acceptable)` });
        } else if (Math.abs(r2Bytes - c.localBytes) / c.localBytes <= SIZE_TOLERANCE) {
          results.push({ key: c.key, result: 'OK' });
        } else {
          results.push({ key: c.key, result: 'SIZE_MISMATCH', details: `R2=${r2Bytes}, local=${c.localBytes}` });
        }
      } catch (err: unknown) {
        const name = err && typeof err === 'object' && 'name' in err ? (err as { name?: string }).name : '?';
        results.push({ key: c.key, result: 'MISSING', details: name });
      }
    }
  }

  const ok = results.filter((r) => r.result === 'OK').length;
  const missing = results.filter((r) => r.result === 'MISSING');
  const mismatch = results.filter((r) => r.result === 'SIZE_MISMATCH');

  console.log(`OK: ${ok} / ${total}`);
  if (missing.length) {
    console.log(`MISSING (${missing.length}):`);
    for (const m of missing) console.log(`  - ${m.key}`);
  }
  if (mismatch.length) {
    console.log(`SIZE_MISMATCH (${mismatch.length}):`);
    for (const m of mismatch) console.log(`  - ${m.key}: ${m.details}`);
  }

  if (missing.length === 0 && mismatch.length === 0) {
    // Mark all as validated
    for (const s of manifest.stories) if (s.status === 'uploaded') s.status = 'validated';
    if (manifest.magnata && manifest.magnata.status === 'uploaded') manifest.magnata.status = 'validated';
    console.log('=== 05-validate done === ALL OK');
  } else {
    console.error('=== 05-validate FAILED ===');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
