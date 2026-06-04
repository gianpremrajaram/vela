import type { Token } from './types';
import { anchorIndex } from './orp';

export interface ChunkAnchor {
  display: string;
  anchorIndex: number;
}

/**
 * Build the displayed string for a chunk (1..3 tokens) and return the index
 * of the character that should be coloured / centred on focalX.
 *
 * - chunkSize 1: display = token.raw, anchor = ORP pivot on the trimmed word.
 * - chunkSize 2/3: display = tokens joined by a single space (each keeping
 *   trailing punctuation). Anchor = character closest to the midpoint; if it
 *   lands on whitespace, step to whichever neighbour better balances the
 *   left/right character counts.
 */
export function chunkAnchor(chunk: ReadonlyArray<Token>, chunkSize: number): ChunkAnchor {
  if (chunk.length === 0) return { display: '', anchorIndex: 0 };
  if (chunkSize <= 1 || chunk.length === 1) {
    const t = chunk[0];
    // The raw word may begin with leading punctuation; orp uses trimLeading
    // internally but returns an index relative to the trimmed start. We
    // re-offset against the raw string so the anchor lands on the right glyph.
    const leading = t.raw.length - t.raw.replace(/^[^\p{L}\p{N}]+/u, '').length;
    return { display: t.raw, anchorIndex: Math.min(t.raw.length - 1, leading + anchorIndex(t.text)) };
  }
  const display = chunk.map((t) => t.raw).join(' ');
  const mid = Math.floor((display.length - 1) / 2);
  if (!/\s/.test(display[mid] ?? '')) {
    return { display, anchorIndex: mid };
  }
  // Whitespace at midpoint — pick the neighbour that better balances.
  const left = mid - 1;
  const right = mid + 1;
  const balLeft = Math.abs(left - (display.length - 1 - left));
  const balRight = Math.abs(right - (display.length - 1 - right));
  return { display, anchorIndex: balRight <= balLeft ? right : left };
}