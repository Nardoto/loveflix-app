// Locale-based catalog filtering. The audio for each story lives in
// `audioByLocale` (legacy mock paths) or `audioKeyByLocale` (R2 keys),
// keyed by lowercase ISO codes (en/de/fr/es). A story is "available" in
// a given locale only if it has audio for that locale.
//
// Coming-soon placeholders have no audio yet but are aspirational catalog
// — we keep them visible across all locales so the rows still feel full
// while real productions are being recorded.

import type { Story } from './stories';

export function isAvailableInLocale(story: Story, locale: string): boolean {
  if (story.isComingSoon) return true;

  const audio = story.audioByLocale ?? story.audioKeyByLocale;
  // Stories without any audio mapping at all (rare — e.g. older flagship
  // entries that only have `videoSrc`) — show everywhere rather than hide
  // since we have no per-locale signal to filter on.
  if (!audio || Object.keys(audio).length === 0) return true;

  return locale in audio;
}

export function filterByLocale<T extends Story>(
  stories: T[],
  locale: string,
): T[] {
  return stories.filter((s) => isAvailableInLocale(s, locale));
}
