// Re-empacota (sem re-comprimir) todo MP4 do bucket R2 com o moov atom no
// INÍCIO do arquivo (ffmpeg -c copy -movflags +faststart). Sem perda de
// qualidade, tamanho praticamente igual.
//
// Por quê: muitos MP4s do catálogo foram exportados com moov no FIM. Isso
// faz o browser baixar grande parte do arquivo antes do `<video>` disparar
// `canplay` — o usuário vê tela preta por 1-2s depois do clique em Watch.
// Com faststart o canplay dispara após os primeiros KB → 300-500ms.
//
// Idempotente: cada arquivo processado recebe metadata custom
// `x-amz-meta-faststart: 1`. Re-executar o script pula os já feitos.
//
// Requer ffmpeg no PATH:
//   winget install Gyan.FFmpeg   (Windows)
//
// Uso:
//   node scripts/optimize-videos.mjs           # processa tudo que falta
//   node scripts/optimize-videos.mjs --dry     # só lista o que mudaria
//   node scripts/optimize-videos.mjs --key=stories/foo/bar.mp4   # 1 arquivo
//   node scripts/optimize-videos.mjs --force   # reprocessa mesmo se marcado

import {
  readFileSync,
  mkdtempSync,
  createWriteStream,
  createReadStream,
  statSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// Carrega .env.local sem dotenv (mesmo padrão de set-r2-cors.mjs).
try {
  const lines = readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  /* OK */
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME ?? 'alluretv-media';

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('✗ R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing in .env.local');
  process.exit(1);
}

let dryRun = false;
let force = false;
let onlyKey = null;
for (const a of process.argv.slice(2)) {
  if (a === '--dry') dryRun = true;
  else if (a === '--force') force = true;
  else if (a.startsWith('--key=')) onlyKey = a.slice(6);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

const fmt = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

async function listAllMp4s() {
  const items = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Key.toLowerCase().endsWith('.mp4')) {
        items.push({ key: obj.Key, size: obj.Size ?? 0 });
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return items;
}

async function headObject(key) {
  return s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function downloadObject(key, destFile) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await pipeline(res.Body, createWriteStream(destFile));
  return {
    contentType: res.ContentType,
    cacheControl: res.CacheControl,
    contentDisposition: res.ContentDisposition,
    metadata: res.Metadata ?? {},
  };
}

function runFfmpeg(input, output) {
  return new Promise((res, rej) => {
    const proc = spawn(
      'ffmpeg',
      ['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', output],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', rej);
    proc.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`ffmpeg exited ${code}\n${stderr.slice(-400)}`));
    });
  });
}

async function uploadObject(key, file, headers) {
  const size = statSync(file).size;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(file),
      ContentLength: size,
      ContentType: headers.contentType ?? 'video/mp4',
      CacheControl: headers.cacheControl,
      ContentDisposition: headers.contentDisposition,
      // Preserva metadata existente + marca como já otimizado para que a
      // próxima execução pule este arquivo (idempotência).
      Metadata: { ...(headers.metadata ?? {}), faststart: '1' },
    }),
  );
  return size;
}

async function processKey(key, sizeBefore) {
  if (!force) {
    try {
      const head = await headObject(key);
      // Metadata keys voltam lowercased.
      if (head.Metadata?.faststart === '1') {
        console.log(`  [skip] já tem faststart`);
        return { skipped: true };
      }
      if (!sizeBefore) sizeBefore = head.ContentLength ?? 0;
    } catch (err) {
      if (err?.name !== 'NotFound') throw err;
    }
  }
  if (dryRun) {
    console.log(`  [dry]  otimizaria (${fmt(sizeBefore)})`);
    return { dryRun: true };
  }
  const tmpDir = mkdtempSync(join(tmpdir(), 'allure-faststart-'));
  const inputFile = join(tmpDir, 'in.mp4');
  const outputFile = join(tmpDir, 'out.mp4');
  try {
    console.log(`  [dl]   baixando...`);
    const meta = await downloadObject(key, inputFile);
    console.log(`  [ffmpeg] reempacotando...`);
    await runFfmpeg(inputFile, outputFile);
    console.log(`  [up]   subindo de volta...`);
    const sizeAfter = await uploadObject(key, outputFile, meta);
    console.log(`  [ok]   ${fmt(sizeBefore)} → ${fmt(sizeAfter)}`);
    return { done: true, sizeBefore, sizeAfter };
  } finally {
    try { unlinkSync(inputFile); } catch {}
    try { unlinkSync(outputFile); } catch {}
    try { rmdirSync(tmpDir); } catch {}
  }
}

async function ensureFfmpeg() {
  await new Promise((res, rej) => {
    const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proc.on('error', () =>
      rej(new Error('ffmpeg não está no PATH. Instale com: winget install Gyan.FFmpeg')),
    );
    proc.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg -version exited ${code}`))));
  });
}

async function main() {
  await ensureFfmpeg();

  console.log(`• Bucket: ${BUCKET}`);
  let items;
  if (onlyKey) {
    items = [{ key: onlyKey, size: 0 }];
    console.log(`• Modo single key: ${onlyKey}`);
  } else {
    console.log(`• Listando .mp4 do bucket...`);
    items = await listAllMp4s();
    console.log(`  ${items.length} arquivo(s) encontrado(s)`);
  }

  if (dryRun) console.log(`• Dry-run: nada será modificado.`);
  if (force) console.log(`• Force: reprocessa mesmo arquivos já marcados.`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i++) {
    const { key, size } = items[i];
    console.log(`\n[${i + 1}/${items.length}] ${key} (${fmt(size)})`);
    try {
      const r = await processKey(key, size);
      if (r.done) done++;
      else if (r.skipped) skipped++;
    } catch (err) {
      failed++;
      console.error(`  [fail] ${err.message}`);
    }
  }

  console.log(`\n✓ Pronto. processados=${done} pulados=${skipped} falhas=${failed}`);
  if (failed > 0) process.exit(1);
}

await main();
