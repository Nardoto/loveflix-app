// Single-author stub. The platform used to surface partner channels in the
// UI (pills on home, "by X" on cards, channel pages); we collapsed all of
// that into a single AllureTV identity. The shape is preserved so the admin
// upload forms keep working without a refactor.

export type Author = {
  id: string;
  name: string;
  tagline: string;
};

export const authors: Author[] = [
  {
    id: 'alluretv',
    name: 'AllureTV',
    tagline: 'Romance stories — listen, watch and read.',
  },
];

export const findAuthor = (id: string): Author | undefined =>
  authors.find((a) => a.id === id);
