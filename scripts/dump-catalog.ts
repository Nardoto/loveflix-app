// Dump the hardcoded catalog (4 authors + 40 stories + 2 flagships + 45
// placeholders) as JSON on stdout. Sister-script of seed-stories.mjs —
// kept as a separate .ts file so tsx can import the project's own .ts
// modules cleanly without the path-escaping headaches that come from
// piping inline source through `tsx -e` on Windows.
//
// Real stories AND placeholders both use ids '001'..'NNN' in the source
// modules — they collide. We prefix the placeholder ids with 'ph_' so
// the seed's upsert(onConflict: 'id') doesn't have placeholders quietly
// overwrite the real (videoKey-bearing) stories.

import { fazendeiro, magnata, stories } from '../lib/data/stories';
import { placeholders } from '../lib/data/placeholders';
import { authors } from '../lib/data/authors';

const real = [fazendeiro, magnata, ...stories];
const phs = placeholders.map((p) => ({ ...p, id: `ph_${p.id}` }));
const all = [...real, ...phs];

const out = {
  authors: authors.map((a, i) => ({ ...a, display_order: i })),
  stories: all.map((s) => ({
    ...s,
    author_id: authors[0].id,
  })),
};

process.stdout.write(JSON.stringify(out));
