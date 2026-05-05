// Groups the flat ebookPages array into chapter blocks for the scroll-based
// reader. Each chapter has one hero image (the first frame of that chapter)
// and a single concatenated HTML body so the reader renders one continuous
// scroll per chapter — Wattpad / Apple Books pattern, validated for mobile.

import type { EbookPage } from './ebook';

export type Chapter = {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  hero: string;
  body: string;
  wordCount: number;
};

export type CoverBlock = { type: 'cover' };
export type FinalBlock = { type: 'final'; title: string; message: string };

export type GroupedBook = {
  cover: CoverBlock | null;
  chapters: Chapter[];
  final: FinalBlock | null;
  totalWords: number;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const countWords = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

export function groupIntoChapters(pages: EbookPage[]): GroupedBook {
  let cover: CoverBlock | null = null;
  let final: FinalBlock | null = null;
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;

  for (const p of pages) {
    if (p.type === 'cover') {
      cover = { type: 'cover' };
      continue;
    }
    if (p.type === 'final') {
      final = { type: 'final', title: p.title, message: p.message };
      continue;
    }

    // Group adjacent pages sharing the same chapter eyebrow.
    if (!current || current.eyebrow !== p.chapter) {
      if (current) {
        current.wordCount = countWords(current.body);
        chapters.push(current);
      }
      current = {
        id: slugify(`${p.chapter}-${p.title}`),
        index: chapters.length,
        eyebrow: p.chapter,
        title: p.title,
        hero: p.img,
        body: p.body,
        wordCount: 0,
      };
    } else {
      current.body += p.body;
    }
  }

  if (current) {
    current.wordCount = countWords(current.body);
    chapters.push(current);
  }

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  return { cover, chapters, final, totalWords };
}

// Average mature-reader pace, slightly conservative vs the typical 200 wpm
// quoted online (target audience skews 55+).
export const READING_WPM = 180;

export const minutesFromWords = (words: number) =>
  Math.max(1, Math.round(words / READING_WPM));
