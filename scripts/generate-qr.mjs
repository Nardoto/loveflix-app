#!/usr/bin/env node
// QR generator — offline, no third-party APIs.
//
// Usage:
//   node scripts/generate-qr.mjs <url> [--out=name] [--logo=path] [--size=2048]
//                                [--dark=#0a0710] [--light=#ffffff] [--margin=2]
//                                [--ec=H] [--no-logo]
//
// Examples:
//   node scripts/generate-qr.mjs https://alluretv.net
//   node scripts/generate-qr.mjs https://alluretv.net --out=landing --size=3000
//   node scripts/generate-qr.mjs https://alluretv.net/r/instagram --out=ig-campaign
//   node scripts/generate-qr.mjs https://alluretv.net --dark=#e85d8a --no-logo
//
// Outputs (in qr-output/):
//   <name>.svg      — vector, infinite zoom, ideal for large print
//   <name>.png      — raster at --size (default 2048px), good for web/social
//   <name>-hi.png   — raster at 2x --size, ideal for offset print
//
// Library: qrcode (MIT) + sharp (Apache-2.0). Zero network calls.

import QRCode from 'qrcode';
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
QR Generator — AllureTV (offline)

Usage:
  node scripts/generate-qr.mjs <url> [flags]

Flags:
  --out=<name>      Output filename base (default: derived from URL)
  --size=<px>       PNG size in pixels (default: 2048)
  --logo=<path>     Center logo path (default: public/logo/mark.jpg)
  --no-logo         Disable center logo
  --dark=<hex>      Foreground / module color (default: #0a0710)
  --light=<hex>     Background color (default: #ffffff)
  --margin=<n>      Quiet zone in modules (default: 2)
  --ec=<L|M|Q|H>    Error correction level (default: H — required if --logo)

Examples:
  node scripts/generate-qr.mjs https://alluretv.net
  node scripts/generate-qr.mjs https://alluretv.net/?utm_source=poster --out=poster-a3
  node scripts/generate-qr.mjs https://alluretv.net --dark=#e85d8a --light=#fff7fb
`);
  process.exit(0);
}

const url = args[0];
if (!/^https?:\/\//i.test(url)) {
  console.error(`✗ First argument must be a full URL (got: ${url})`);
  process.exit(1);
}

const flags = Object.fromEntries(
  args.slice(1).map((a) => {
    if (a === '--no-logo') return ['noLogo', true];
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a, true];
  }),
);

const outName = flags.out || deriveName(url);
const size = parseInt(flags.size ?? '2048', 10);
const dark = normalizeHex(flags.dark ?? '#0a0710');
const light = normalizeHex(flags.light ?? '#ffffff');
const margin = parseInt(flags.margin ?? '2', 10);
const ec = (flags.ec ?? 'H').toUpperCase();
const logoPath = flags.noLogo
  ? null
  : resolve(repoRoot, flags.logo ?? 'public/logo/mark.jpg');

if (!['L', 'M', 'Q', 'H'].includes(ec)) {
  console.error(`✗ --ec must be one of L, M, Q, H (got: ${ec})`);
  process.exit(1);
}
if (logoPath && ec !== 'H') {
  console.warn(`⚠  Using --ec=${ec} with a center logo — recommend H for reliability.`);
}

const outDir = resolve(repoRoot, 'qr-output');
await mkdir(outDir, { recursive: true });

const qrOpts = {
  errorCorrectionLevel: ec,
  margin,
  color: { dark, light },
};

console.log(`→ Encoding: ${url}`);
console.log(`  ec=${ec}  margin=${margin}  dark=${dark}  light=${light}`);
console.log(`  logo=${logoPath ?? '(none)'}`);

// 1) SVG
const svgString = await QRCode.toString(url, { ...qrOpts, type: 'svg', width: size });
const svgFinal = logoPath ? await embedLogoInSvg(svgString, logoPath) : svgString;
const svgPath = join(outDir, `${outName}.svg`);
await writeFile(svgPath, svgFinal);
console.log(`✓ ${relativize(svgPath)}`);

// 2) PNG at --size
const pngPath = join(outDir, `${outName}.png`);
await renderPng(url, qrOpts, size, logoPath, pngPath);
console.log(`✓ ${relativize(pngPath)}`);

// 3) PNG at 2x (high-res for print)
const hiSize = size * 2;
const pngHiPath = join(outDir, `${outName}-hi.png`);
await renderPng(url, qrOpts, hiSize, logoPath, pngHiPath);
console.log(`✓ ${relativize(pngHiPath)}  (${hiSize}×${hiSize})`);

console.log(`\nDone. Files in qr-output/`);

// ───────────────────────────────────────────────────────────

async function renderPng(text, opts, width, logo, outPath) {
  const qrBuffer = await QRCode.toBuffer(text, { ...opts, type: 'png', width });
  if (!logo) {
    await writeFile(outPath, qrBuffer);
    return;
  }
  // logo occupies ~20% of QR width (well below 30% ec-H tolerance)
  const logoSize = Math.round(width * 0.2);
  const pad = Math.round(logoSize * 0.12);
  const boxSize = logoSize + pad * 2;

  // Load logo, resize, give it a rounded white card behind for contrast
  const logoResized = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();

  const card = await sharp({
    create: {
      width: boxSize,
      height: boxSize,
      channels: 4,
      background: light,
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${boxSize}" height="${boxSize}"><rect x="0" y="0" width="${boxSize}" height="${boxSize}" rx="${Math.round(boxSize * 0.18)}" ry="${Math.round(boxSize * 0.18)}" fill="${light}"/></svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: logoResized, top: pad, left: pad },
    ])
    .png()
    .toBuffer();

  const left = Math.round((width - boxSize) / 2);
  await sharp(qrBuffer)
    .composite([{ input: card, top: left, left }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function embedLogoInSvg(svgString, logoPath) {
  // Read logo, encode as base64 data URI, drop into the SVG center
  const buf = await readFile(logoPath);
  const ext = logoPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  const dataUri = `data:image/${ext};base64,${buf.toString('base64')}`;

  // Pull viewBox so coordinates map correctly regardless of QR module count
  const vbMatch = svgString.match(/viewBox="([\d\s.]+)"/);
  if (!vbMatch) return svgString; // fail-safe: return plain QR
  const nums = vbMatch[0].match(/[\d.]+/g).map(Number);
  const w = nums[2];
  const h = nums[3];
  const logoW = w * 0.2;
  const padW = logoW * 0.12;
  const boxW = logoW + padW * 2;
  const cx = (w - boxW) / 2;
  const cy = (h - boxW) / 2;
  const rx = boxW * 0.18;

  const insert = `
  <rect x="${cx}" y="${cy}" width="${boxW}" height="${boxW}" rx="${rx}" ry="${rx}" fill="${light}"/>
  <image href="${dataUri}" x="${cx + padW}" y="${cy + padW}" width="${logoW}" height="${logoW}" preserveAspectRatio="xMidYMid slice"/>`;

  return svgString.replace(/<\/svg>\s*$/, `${insert}\n</svg>`);
}

function deriveName(url) {
  try {
    const u = new URL(url);
    const slug = (u.hostname + u.pathname)
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return slug || 'qr';
  } catch {
    return 'qr';
  }
}

function normalizeHex(s) {
  const v = String(s).trim();
  if (!/^#[0-9a-f]{3,8}$/i.test(v)) {
    console.error(`✗ Invalid color: ${s}`);
    process.exit(1);
  }
  return v;
}

function relativize(p) {
  return p.replace(repoRoot, '').replace(/^[\\/]+/, '');
}
