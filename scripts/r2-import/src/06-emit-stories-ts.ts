// 06-emit-stories-ts.ts — atualiza lib/data/stories.ts a partir do manifest.
// Usa ts-morph (AST) para preservar tipo, helpers e exports legados (fazendeiro, allStories, catalogRows, findStory).
// Estratégia: substitui o array literal `stories` e adiciona `export const magnata`.

import { Project, SyntaxKind, Node } from 'ts-morph';
import { resolve } from 'node:path';
import { APP_ROOT } from './lib/config.ts';
import { readManifest, type Locale, type StoryEntry } from './lib/manifest.ts';

const STORIES_FILE = resolve(APP_ROOT, 'lib/data/stories.ts');

function escapeString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tropesLiteral(tropes: string[]): string {
  return `[${tropes.map((t) => `'${escapeString(t)}'`).join(', ')}]`;
}

function audioKeysObjectLiteral(keys: Partial<Record<Locale, string>>): string {
  const entries = (Object.entries(keys) as Array<[Locale, string | undefined]>)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}: '${escapeString(v!)}'`);
  if (entries.length === 0) return '{}';
  return `{ ${entries.join(', ')} }`;
}

function storyToCallExpr(s: StoryEntry): string {
  const audioKeysObj = audioKeysObjectLiteral(s.targets.audioKeys);
  // s(num, { ... }) — uses helper already in stories.ts
  const fields: string[] = [
    `slug: '${escapeString(s.slug)}'`,
    `title: '${escapeString(s.title)}'`,
    `genre: '${s.genre}'`,
    `tropes: ${tropesLiteral(s.tropes)}`,
    `synopsis: '${escapeString(s.synopsis || s.title)}'`,
    `isFree: true`,
    `videoKey: '${escapeString(s.targets.videoKey)}'`,
    `coverKey: '${escapeString(s.targets.coverKey)}'`,
    `audioKeyByLocale: ${audioKeysObj}`,
  ];
  return `s(${s.num}, { ${fields.join(', ')} })`;
}

function magnataConst(m: StoryEntry): string {
  const audioKeysObj = audioKeysObjectLiteral(m.targets.audioKeys);
  return `
// Premium flagship — gated by Worker FREE_PREFIXES.
export const magnata: Story = {
  id: 'magnata',
  slug: '${escapeString(m.slug)}',
  cover: '/covers/magnata.jpg',
  title: '${escapeString(m.title)}',
  genre: '${m.genre}',
  tropes: ${tropesLiteral(m.tropes)},
  synopsis: '${escapeString(m.synopsis || m.title)}',
  isFree: false,
  isHot: true,
  ageRating: '18+',
  totalMinutes: 60,
  videoKey: '${escapeString(m.targets.videoKey)}',
  coverKey: '${escapeString(m.targets.coverKey)}',
  audioKeyByLocale: ${audioKeysObj},
  hasEbook: false,
};
`.trim();
}

function ensureCoverKeyInStoryType(project: Project): void {
  const file = project.getSourceFileOrThrow(STORIES_FILE);
  const typeAlias = file.getTypeAlias('Story');
  if (!typeAlias) return;
  const text = typeAlias.getText();
  if (text.includes('coverKey')) return;
  // Inject `coverKey?: string;` near the other media-key fields
  const declNode = typeAlias.getTypeNodeOrThrow();
  const newText = declNode
    .getText()
    .replace(/(audioKeyByLocale\?:[^;]+;)/, `$1\n  coverKey?: string;`);
  declNode.replaceWithText(newText);
}

function ensureIsPremiumOnStoryType(project: Project): void {
  const file = project.getSourceFileOrThrow(STORIES_FILE);
  const typeAlias = file.getTypeAlias('Story');
  if (!typeAlias) return;
  const text = typeAlias.getText();
  if (text.includes('isPremium')) return;
  const declNode = typeAlias.getTypeNodeOrThrow();
  const newText = declNode
    .getText()
    .replace(/(isFree\?:[^;]+;)/, `$1\n  isPremium?: boolean;`);
  declNode.replaceWithText(newText);
}

function main(): void {
  const manifest = readManifest();
  if (!manifest) {
    console.error('No manifest');
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: resolve(APP_ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });
  const file = project.addSourceFileAtPath(STORIES_FILE);

  ensureCoverKeyInStoryType(project);
  ensureIsPremiumOnStoryType(project);

  // Locate `export const stories: Story[] = [...];`
  const storiesVar = file.getVariableDeclaration('stories');
  if (!storiesVar) throw new Error('Could not find `stories` variable in ' + STORIES_FILE);
  const arrayNode = storiesVar.getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  // Build new content
  const newElements = manifest.stories.map((s) => storyToCallExpr(s));
  arrayNode.replaceWithText(`[\n  ${newElements.join(',\n  ')},\n]`);

  // Add or replace `magnata` export. Look for an existing one.
  let magnataVar = file.getVariableDeclaration('magnata');
  if (manifest.magnata) {
    const newConstText = magnataConst(manifest.magnata);
    if (magnataVar) {
      // Replace the entire VariableStatement (parent of the declaration)
      const stmt = magnataVar.getVariableStatementOrThrow();
      stmt.replaceWithText(newConstText);
    } else {
      // Insert just before `export const allStories`
      const allStoriesVar = file.getVariableDeclarationOrThrow('allStories');
      const allStoriesStmt = allStoriesVar.getVariableStatementOrThrow();
      allStoriesStmt.replaceWithText(`${newConstText}\n\n${allStoriesStmt.getText()}`);
      magnataVar = file.getVariableDeclaration('magnata');
    }
  }

  // Update allStories export to include magnata after fazendeiro
  const allStoriesVar = file.getVariableDeclarationOrThrow('allStories');
  const allStoriesInit = allStoriesVar.getInitializerOrThrow();
  if (manifest.magnata && !allStoriesInit.getText().includes('magnata')) {
    allStoriesInit.replaceWithText('[fazendeiro, magnata, ...stories]');
  }

  file.saveSync();
  console.log(`Wrote ${STORIES_FILE}`);
  console.log(`Stories array: ${manifest.stories.length} entries (free)`);
  console.log(`Magnata: ${manifest.magnata ? 'updated' : 'no change'}`);
  console.log(`\nReview the diff with:\n  git diff -- lib/data/stories.ts`);
}

try {
  main();
} catch (err) {
  console.error('FAILED:', err);
  process.exit(1);
}
