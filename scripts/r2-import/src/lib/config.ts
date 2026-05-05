// Centralizes paths + tiny helpers shared by every script.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// scripts/r2-import/src/lib → app root
export const APP_ROOT = resolve(__dirname, '../../../..');
export const IMPORT_ROOT = resolve(APP_ROOT, 'scripts/r2-import');
export const WORKSPACE = resolve(IMPORT_ROOT, '_workspace');
export const EXTRACTED = resolve(WORKSPACE, 'extracted');
export const AUDIO_OUT = resolve(WORKSPACE, 'audio');
export const STATE_DIR = resolve(WORKSPACE, 'state');
export const LOGS_DIR = resolve(WORKSPACE, 'logs');
export const MANIFEST_PATH = resolve(WORKSPACE, 'manifest.json');

export const SOURCES = {
  en: 'C:/Users/tharc/Downloads/INGLES',
  de: 'C:/Users/tharc/Downloads/ALEMÃO',
  fr: 'C:/Users/tharc/Downloads/VIDEOS FRANCES',
  magnata:
    'C:/Users/tharc/Downloads/MAGNATA-ingles erótico. video novo-20260505T031038Z-3-001/MAGNATA-ingles erótico. video novo',
} as const;

// Load .env.local from the Next.js project (where R2 credentials live).
loadDotenv({ path: resolve(APP_ROOT, '.env.local') });

export function ensureDirs(): void {
  for (const d of [WORKSPACE, EXTRACTED, AUDIO_OUT, STATE_DIR, LOGS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — fill .env.local in the app root`);
  return v;
}
