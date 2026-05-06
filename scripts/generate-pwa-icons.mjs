// One-shot helper that derives the PWA icon set from the master logo at
// public/logo/mark.jpg. The PWA install prompt on Chrome (Android) verifies
// the actual image dimensions against what the manifest declares — so we
// emit dedicated 192/512 PNGs plus a 1024 fallback. Maskable variants get
// inset padding so Android adaptive icon shapes don't crop the monogram.
//
// Run with:  node scripts/generate-pwa-icons.mjs

import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'public/logo/mark.jpg');
const outDir = resolve(root, 'public/icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const BG = { r: 10, g: 7, b: 16, alpha: 1 }; // matches manifest theme/background

async function emitAny(size) {
  const out = resolve(outDir, `icon-${size}.png`);
  await sharp(src)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${out} (any)`);
}

async function emitMaskable(size) {
  // Maskable spec: keep the recognizable content within the inner 80% of the
  // image. We resize the logo to 80% and pad the rest with the brand bg so
  // the adaptive shape mask never clips the monogram.
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const out = resolve(outDir, `icon-maskable-${size}.png`);
  const inset = await sharp(src).resize(inner, inner, { fit: 'cover' }).toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: inset, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${out} (maskable)`);
}

await emitAny(192);
await emitAny(512);
await emitMaskable(192);
await emitMaskable(512);
await emitAny(1024); // iOS apple-touch-icon prefers a generous square
console.log('\nDone. Update app/manifest.ts to point to /icons/icon-* if not already.');
