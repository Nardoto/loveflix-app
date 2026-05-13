// HOT collection — editorially curated "spicier" stories that get the
// red-flame treatment. The dedicated /hot page groups them by sub-theme.
import { allStories, type Story } from './stories';
import { storyHasGenre } from './genre-helpers';

const HOT_SLUGS = new Set([
  'he-had-never-touched-me',
  'the-mafias-bride',
  'wedding-she-couldnt-stop',
  'forbidden-vital-signs',
  'bride-who-came-back',
  'the-stepfather',
  'the-wrong-groom',
  'after-hours-mr-ceo',
  'enemy-blood',
  'cartels-captive',
  'wound-he-hid',
  'brides-last-move',
  'boy-who-came-home-rich',
  'daughter-he-never-told',
  'master-and-the-maid',
  'tutors-rules',
  'ink-and-iron',
  'husbands-best-friend',
  'my-husbands-brother',
  'confession-at-midnight',
]);

/** True if the story is in the HOT collection (either flagged in the data
    or hand-picked in HOT_SLUGS above). Use this everywhere a Hot badge or
    filter is needed so curation lives in one file. */
export const isStoryHot = (story: Story): boolean =>
  story.isHot === true || HOT_SLUGS.has(story.slug);

export const hotStories: Story[] = allStories.filter(isStoryHot);

export const hotByGenre = (genre: Story['genre']): Story[] =>
  hotStories.filter((s) => storyHasGenre(s, genre));
