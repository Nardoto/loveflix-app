// Auto-detect genre + tropes from title + synopsis. The user reviews/edits manually
// after the catalog is regenerated. Default genre is "forbidden" (most common).

export type Genre =
  | 'mafia'
  | 'billionaire'
  | 'forbidden'
  | 'secret_baby'
  | 'second_chance'
  | 'arranged'
  | 'royal'
  | 'mood';

const RULES: Array<{ genre: Genre; trope: string; rx: RegExp }> = [
  // Highest-priority genre signals first — first match wins
  { genre: 'royal', trope: 'royalty', rx: /\b(prince|princess|king|queen|royal|palace|crown|kingdom|throne)\b/i },
  { genre: 'mafia', trope: 'mafia', rx: /\b(mafia|cartel|don|bratva|hitman|gang|mob|underworld|enemy blood)\b/i },
  { genre: 'secret_baby', trope: 'secret child', rx: /\b(pregnan|baby|son|daughter|hidden child|secret child|child.*his)\b/i },
  { genre: 'billionaire', trope: 'billionaire', rx: /\b(billionaire|tycoon|magnate|mogul|CEO|boardroom|empire|millionaire)\b/i },
  { genre: 'arranged', trope: 'arranged marriage', rx: /\b(arranged marriage|contract (marriage|wife|bride)|forced marriage|wedding)\b/i },
  { genre: 'second_chance', trope: 'second chance', rx: /\b(years (later|after)|came back|returns|ex(-| )(lover|husband|wife|girlfriend|boyfriend)|reunion)\b/i },
  { genre: 'forbidden', trope: 'forbidden love', rx: /\b(stepfather|stepbrother|brother(?:-|\s)in(?:-|\s)law|step|priest|tutor|teacher|professor|doctor|nurse|surgeon|forbidden|taboo|husband.*best friend|best friend.*husband)\b/i },
];

const TROPE_RULES: Array<{ trope: string; rx: RegExp }> = [
  { trope: 'enemies-to-lovers', rx: /\benemies?(-|\s)?to(-|\s)?lovers?\b|hate.*love/i },
  { trope: 'one night stand', rx: /\bone(-|\s)night\b|one(-|\s)night stand/i },
  { trope: 'workplace', rx: /\b(office|assistant|secretary|boss|workplace|company)\b/i },
  { trope: 'age gap', rx: /\b(twice (?:my|her) age|age gap|older man|young(?:er)? woman)\b/i },
  { trope: 'forbidden', rx: /\bforbidden\b/i },
  { trope: 'possessive', rx: /\bpossessive|obsess(?:ive|ed)|own(?:ed)? (?:her|me)\b/i },
  { trope: 'revenge', rx: /\brevenge|vengeance|retribution\b/i },
  { trope: 'first time', rx: /\bvirgin|first time|never (?:touched|kissed)\b/i },
  { trope: 'wedding', rx: /\bwedding|altar|aisle|vow/i },
  { trope: 'dark', rx: /\bdark|dangerous|shadow\b/i },
  { trope: 'cowboy', rx: /\bcowboy|ranch|ranchman|farmer|texas\b/i },
];

/**
 * Returns the inferred genre + 2-3 tropes. Pure function (deterministic).
 */
export function detectGenreAndTropes(title: string, synopsis: string): {
  genre: Genre;
  tropes: string[];
} {
  const text = `${title}\n${synopsis}`.toLowerCase();

  // Pick the first matching genre rule.
  let genre: Genre = 'forbidden';
  for (const rule of RULES) {
    if (rule.rx.test(text)) {
      genre = rule.genre;
      break;
    }
  }

  // Collect 2-3 distinct tropes. Always seed with the genre's primary trope.
  const tropes = new Set<string>();
  const primary = RULES.find((r) => r.genre === genre)?.trope;
  if (primary) tropes.add(primary);
  for (const rule of TROPE_RULES) {
    if (tropes.size >= 3) break;
    if (rule.rx.test(text)) tropes.add(rule.trope);
  }
  if (tropes.size === 0) tropes.add('forbidden love');

  return { genre, tropes: Array.from(tropes).slice(0, 3) };
}
