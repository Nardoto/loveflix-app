// Pure helpers compartilhados entre server e client. Story type pode ter
// `genre` (singular, legado) e/ou `genres` (array novo). Filtros do
// catálogo devem checar ambos pra não esconder stories antigas.

import type { Genre, Story } from './stories';

/** True se a story tem o `genre` como tag (primário ou no array). */
export function storyHasGenre(story: Story, genre: Genre): boolean {
  if (story.genre === genre) return true;
  return !!story.genres?.includes(genre);
}

/** Lista todas as tags de gênero de uma story (primário + array, sem duplicar). */
export function storyGenres(story: Story): Genre[] {
  const set = new Set<Genre>();
  if (story.genre) set.add(story.genre);
  for (const g of story.genres ?? []) set.add(g);
  return Array.from(set);
}
