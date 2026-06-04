import type { DocumentModel, Preferences, ReaderState, Token } from './types';
import { dwellMs } from './dwell';

export interface AdvanceResult {
  state: ReaderState;
  flashed: boolean;
  finished: boolean;
  currentChunk: Token[];
  currentDwell: number;
  accumulator: number;
}

// Build the chunk starting at `index` (chunkSize consecutive tokens, bounded by doc end).
export function chunkAt(doc: DocumentModel, index: number, chunkSize: number): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < chunkSize && index + i < doc.tokens.length; i++) {
    out.push(doc.tokens[index + i]);
  }
  return out;
}

// Pure reducer: given current state + accumulated elapsed time, advance by
// chunk size when the accumulator meets the chunk's dwell. May advance multiple
// chunks if elapsed was very large (catch-up after a tab switch).
export function advance(
  doc: DocumentModel,
  state: ReaderState,
  prefs: Preferences,
  accumulator: number,
): AdvanceResult {
  let acc = accumulator;
  let { index } = state;
  let flashed = false;

  // Loop guards against pathological catch-up storms.
  let safety = 8;
  while (safety-- > 0) {
    const chunk = chunkAt(doc, index, prefs.reading.chunkSize);
    if (chunk.length === 0) {
      return {
        state: { ...state, index, isPlaying: false },
        flashed,
        finished: true,
        currentChunk: [],
        currentDwell: 0,
        accumulator: 0,
      };
    }
    const dwell = dwellMs(chunk, prefs.reading);
    if (acc < dwell) {
      return {
        state: { ...state, index },
        flashed,
        finished: false,
        currentChunk: chunk,
        currentDwell: dwell,
        accumulator: acc,
      };
    }
    acc -= dwell;
    index = Math.min(doc.tokens.length, index + chunk.length);
    flashed = true;
  }
  return {
    state: { ...state, index },
    flashed,
    finished: index >= doc.tokens.length,
    currentChunk: chunkAt(doc, index, prefs.reading.chunkSize),
    currentDwell: 0,
    accumulator: 0,
  };
}