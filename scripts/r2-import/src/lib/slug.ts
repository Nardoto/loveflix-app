// Deterministic slug generation. Stable across runs given same title.

import slugify from '@sindresorhus/slugify';

const MAX_LEN = 60;

// Slugs already in lib/data/stories.ts that we must NOT collide with.
const RESERVED = new Set<string>([
  'he-had-never-touched-me',
  'magnata',
  // The 45 mocked stories — full list pulled from stories.ts. We don't import the
  // file (would need ts-morph here) — duplicating slugs as strings is cheap and avoids
  // a circular dependency.
  'the-mafias-bride',
  'wedding-she-couldnt-stop',
  'boardroom-rule',
  'forbidden-vital-signs',
  'bride-who-came-back',
  'one-last-glass',
  'billionaires-nurse',
  'the-stepfather',
  'after-hours-mr-ceo',
  'the-wrong-groom',
  'princes-mistake',
  'suite-at-midnight',
  'enemy-blood',
  'the-dons-promise',
  'cartels-captive',
  'bratva-wife',
  'wound-he-hid',
  'brides-last-move',
  'cup-of-his-order',
  'contract-wife',
  'heir-nobody-wanted',
  'maid-in-his-mothers-house',
  'prenup-he-couldnt-sign',
  'email-i-never-sent',
  'letter-in-grandmas-drawer',
  'boy-who-came-home-rich',
  'wedding-nobody-took-seriously',
  'daughter-he-never-told',
  'master-and-the-maid',
  'tutors-rules',
  'prince-who-took-her-hand',
  'ink-and-iron',
  'boy-at-his-door',
  'husbands-best-friend',
  'tutor-at-dusk',
  'my-husbands-brother',
  'confession-at-midnight',
  'morning-after',
  'house-on-cliff-road',
  'jet-at-sunset',
  'tear-she-didnt-wipe',
  'sand-and-gold',
  'ash-in-the-mirror',
  'hotel-on-5th',
  'terrace-in-positano',
]);

/**
 * Build a stable slug from a title. Truncates to MAX_LEN. Falls back to `story-<num>`
 * if the title is empty/garbage. Suffixes `-<num>` if it would collide with anything
 * in `taken` (passed by the caller — usually accumulating slugs already issued in this
 * batch) or with the RESERVED set above.
 */
export function makeSlug(title: string, num: number, taken: Set<string>): string {
  const fallback = `story-${num}`;
  const cleanTitle = (title ?? '').trim();
  const base = cleanTitle ? slugify(cleanTitle).slice(0, MAX_LEN) : fallback;

  // Empty after slugify (all non-ASCII, etc.) → fallback
  let candidate = base.replace(/^-+|-+$/g, '') || fallback;

  if (!RESERVED.has(candidate) && !taken.has(candidate)) return candidate;

  // Collision → suffix with -<num>. Truncate to fit MAX_LEN.
  const suffix = `-${num}`;
  const trimmed = candidate.slice(0, MAX_LEN - suffix.length).replace(/-+$/g, '');
  candidate = `${trimmed}${suffix}`;
  if (!RESERVED.has(candidate) && !taken.has(candidate)) return candidate;

  // Worst case: prefix story-<num> (deterministic, can't collide unless num repeats)
  return fallback;
}
