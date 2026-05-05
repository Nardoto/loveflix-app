// 01-unzip.ts — descompacta os ZIPs do Google Drive em _workspace/extracted/<lang>/.
// Usa o `unzip` nativo do Git Bash (mais robusto com nomes acentuados que libs JS).
// Idempotente: pula ZIPs que já têm marker .unzip-done.

import { spawn } from 'node:child_process';
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { SOURCES, EXTRACTED, ensureDirs } from './lib/config.ts';
import { runPool } from './lib/pool.ts';

type Lang = keyof typeof SOURCES;

async function unzip(zipPath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  return new Promise((res, rej) => {
    // -o : overwrite without prompting
    // -q : quiet (less terminal spam — we log progress per-zip)
    const proc = spawn('unzip', ['-oq', zipPath, '-d', destDir], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    proc.on('error', rej);
    proc.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`unzip exited ${code} for ${zipPath}`));
    });
  });
}

async function processLang(lang: Lang): Promise<{ extracted: number; skipped: number }> {
  const sourceDir = SOURCES[lang];
  if (!existsSync(sourceDir)) {
    console.log(`[${lang}] source dir missing — skip: ${sourceDir}`);
    return { extracted: 0, skipped: 0 };
  }

  // MAGNATA is already extracted at SOURCES.magnata — copy reference, no zip work needed.
  if (lang === 'magnata') {
    console.log(`[magnata] using pre-extracted folder at ${sourceDir}`);
    return { extracted: 0, skipped: 1 };
  }

  const zips = readdirSync(sourceDir)
    .filter((f) => f.toLowerCase().endsWith('.zip'))
    .map((f) => join(sourceDir, f));

  if (zips.length === 0) {
    console.log(`[${lang}] no ZIPs found in ${sourceDir}`);
    return { extracted: 0, skipped: 0 };
  }

  const destDir = resolve(EXTRACTED, lang);

  let extracted = 0;
  let skipped = 0;

  // 2 ZIPs in parallel — I/O bound, more than that thrashes the disk.
  await runPool(zips, 2, async (zipPath) => {
    const marker = `${zipPath}.unzip-done`;
    if (existsSync(marker)) {
      skipped++;
      console.log(`[${lang}] skip ${zipPath.split(/[\\/]/).pop()} (already done)`);
      return;
    }
    const start = Date.now();
    console.log(`[${lang}] unzip ${zipPath.split(/[\\/]/).pop()} → ${destDir}`);
    await unzip(zipPath, destDir);
    writeFileSync(marker, new Date().toISOString());
    extracted++;
    console.log(`[${lang}] done ${zipPath.split(/[\\/]/).pop()} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  });

  return { extracted, skipped };
}

async function main(): Promise<void> {
  ensureDirs();
  const langs: Lang[] = ['en', 'de', 'fr', 'magnata'];

  console.log('=== 01-unzip starting ===');
  const totals = { extracted: 0, skipped: 0 };
  for (const lang of langs) {
    const r = await processLang(lang);
    totals.extracted += r.extracted;
    totals.skipped += r.skipped;
  }
  console.log('=== 01-unzip done ===');
  console.log(`Extracted: ${totals.extracted}, skipped: ${totals.skipped}`);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
