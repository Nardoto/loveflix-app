// Author / channel metadata. Maps each story to one of the partner's
// YouTube channels — same identity used to drive the home pill bar.
import type { Story } from './stories';

export type Author = {
  id: string;
  initial: string;
  name: string;
  tagline: string;
  bio: string;
  color: string; // tailwind classes — gradient bg
  avatar: string; // path under /public
  youtube: string; // external URL
  /** CSS variable name for the creator's signature script font.
      Defined in `app/[locale]/layout.tsx` via `next/font/google`. */
  font: string;
};

export const authors: Author[] = [
  {
    id: 'lena',
    initial: 'L',
    name: 'Liebesgeschichten',
    tagline: 'by Lena',
    bio: 'German-language romance — second chance, royal, mood pieces.',
    color: 'from-rose to-rose-deep',
    avatar: '/channels/lena.jpg',
    youtube: 'https://www.youtube.com/@liebesgeschichten1',
    font: 'var(--font-lena)', // Sacramento — gentle, romantic
  },
  {
    id: 'david',
    initial: 'D',
    name: 'by David',
    tagline: 'Billionaire & boardroom',
    bio: 'Power suits, late-night offices and contract marriages.',
    color: 'from-amber-500 to-amber-700',
    avatar: '/channels/david.jpg',
    youtube: 'https://www.youtube.com/@romancestoriesdavid',
    font: 'var(--font-david)', // Great Vibes — formal, sophisticated
  },
  {
    id: 'adam',
    initial: 'A',
    name: 'by Adam',
    tagline: 'Dark mafia',
    bio: 'Forced marriages, family feuds and possessive grooms.',
    color: 'from-red-700 to-red-900',
    avatar: '/channels/adam.jpg',
    youtube: 'https://www.youtube.com/@romancestories231',
    font: 'var(--font-adam)', // Yellowtail — bold brush stroke
  },
  {
    id: 'marcus',
    initial: 'M',
    name: 'by Marcus',
    tagline: 'Forbidden & secret',
    bio: 'Hidden babies, taboo love and confessions at midnight.',
    color: 'from-purple-700 to-purple-900',
    avatar: '/channels/marcus.jpg',
    youtube: 'https://www.youtube.com/@marcusstories123',
    font: 'var(--font-marcus)', // Pinyon Script — fine calligraphy
  },
];

export const findAuthor = (id: string): Author | undefined =>
  authors.find((a) => a.id === id);

/** Short first-name display for the "By X" tag on story cards. */
export const creatorName = (author: Author): string =>
  author.id.charAt(0).toUpperCase() + author.id.slice(1);

// Derive author from story genre — keeps stories.ts clean and lets us
// re-balance distribution without editing the catalog.
export const getAuthorFor = (story: Story): Author => {
  // The flagship "He Had Never Touched Me" is co-published by Lena.
  if (story.id === 'fazendeiro') return authors[0];
  switch (story.genre) {
    case 'second_chance':
    case 'royal':
    case 'mood':
      return authors[0]; // Lena
    case 'billionaire':
    case 'arranged':
      return authors[1]; // David
    case 'mafia':
      return authors[2]; // Adam
    case 'forbidden':
    case 'secret_baby':
    default:
      return authors[3]; // Marcus
  }
};

export const filterByAuthor = (stories: Story[], authorId: string | null): Story[] => {
  if (!authorId) return stories;
  return stories.filter((s) => getAuthorFor(s).id === authorId);
};
