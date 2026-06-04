// Optimal Recognition Point pivot table.
// Strips leading punctuation/whitespace; returns index relative to the trimmed
// word's start. Callers render the trimmed word + the original trailing punctuation.

const LEADING_RE = /^[^\p{L}\p{N}]+/u;

export function trimLeading(word: string): string {
  return word.replace(LEADING_RE, '');
}

export function anchorIndex(word: string): number {
  const w = trimLeading(word);
  const len = [...w].length; // unicode-safe length
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}