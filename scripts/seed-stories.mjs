// One-shot seed: walks the hardcoded catalog (authors + 87 stories) and
// upserts everything into Supabase. Idempotent — re-running won't dup.
//
// Run with:
//   node scripts/seed-stories.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// the env. Reads the catalog by importing the .ts modules transpiled via
// tsx — kept zero-dep by only using the .mjs runtime + supabase-js.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// Pull SUPABASE_* from .env.local without adding dotenv as a dep.
const envFile = resolve(root, '.env.local');
try {
  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) {
      process.env[k] = v.replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  /* .env.local may not exist on CI */
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}
const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// --- Read the catalog by piping it through tsx -----------------------
// We dump a JSON snapshot via a tiny inline TS program so this seeder
// stays language-agnostic about the catalog format.
function dumpCatalog() {
  const r = spawnSync(
    'npx',
    ['--yes', 'tsx', '-e', `
      import { allStories } from '${resolve(root, 'lib/data/stories.ts').replace(/\\\\/g, '/')}';
      import { authors, getAuthorFor } from '${resolve(root, 'lib/data/authors.ts').replace(/\\\\/g, '/')}';
      const out = {
        authors: authors.map((a, i) => ({ ...a, display_order: i })),
        stories: allStories.map((s) => ({
          ...s,
          author_id: getAuthorFor(s).id,
        })),
      };
      process.stdout.write(JSON.stringify(out));
    `],
    { encoding: 'utf8', cwd: root, shell: true },
  );
  if (r.status !== 0) {
    console.error('tsx failed:', r.stderr);
    process.exit(r.status ?? 1);
  }
  return JSON.parse(r.stdout);
}

console.log('• Loading catalog from lib/data/...');
const { authors, stories } = dumpCatalog();
console.log(`  ${authors.length} authors, ${stories.length} stories`);

// --- Upsert authors --------------------------------------------------
console.log('• Upserting authors...');
{
  const rows = authors.map((a) => ({
    id: a.id,
    initial: a.initial,
    name: a.name,
    tagline: a.tagline,
    bio: a.bio,
    color: a.color,
    avatar: a.avatar,
    youtube: a.youtube,
    font_var: a.font,
    display_order: a.display_order,
  }));
  const { error } = await sb.from('authors').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('  ✗ authors upsert failed:', error.message);
    process.exit(1);
  }
  console.log(`  ✓ ${rows.length} authors`);
}

// --- Upsert stories --------------------------------------------------
console.log('• Upserting stories...');
{
  const rows = stories.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    cover: s.cover,
    cover_key: s.coverKey ?? null,
    genre: s.genre,
    tropes: s.tropes ?? [],
    synopsis: s.synopsis,
    is_free: !!s.isFree,
    is_premium: !!s.isPremium,
    is_hot: !!s.isHot,
    is_coming_soon: !!s.isComingSoon,
    age_rating: s.ageRating ?? '18+',
    total_minutes: s.totalMinutes ?? 45,
    has_ebook: !!s.hasEbook,
    video_src: s.videoSrc ?? null,
    video_key: s.videoKey ?? null,
    author_id: s.author_id,
    published_at: s.isComingSoon ? null : new Date().toISOString(),
  }));
  // Chunked upsert (Supabase REST has a payload limit).
  const CHUNK = 40;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await sb.from('stories').upsert(slice, { onConflict: 'id' });
    if (error) {
      console.error(`  ✗ stories[${i}..${i + slice.length}] upsert failed:`, error.message);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${rows.length} stories`);
}

// --- Upsert per-locale audio -----------------------------------------
console.log('• Upserting story_audio rows...');
{
  const rows = [];
  for (const s of stories) {
    const byUrl = s.audioByLocale ?? {};
    const byKey = s.audioKeyByLocale ?? {};
    const locales = new Set([...Object.keys(byUrl), ...Object.keys(byKey)]);
    for (const locale of locales) {
      rows.push({
        story_id: s.id,
        locale,
        audio_src: byUrl[locale] ?? null,
        audio_key: byKey[locale] ?? null,
      });
    }
  }
  if (rows.length) {
    const CHUNK = 80;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await sb
        .from('story_audio')
        .upsert(slice, { onConflict: 'story_id,locale' });
      if (error) {
        console.error(`  ✗ story_audio[${i}..${i + slice.length}] failed:`, error.message);
        process.exit(1);
      }
    }
  }
  console.log(`  ✓ ${rows.length} story_audio entries`);
}

console.log('\n✓ Seed complete.');
