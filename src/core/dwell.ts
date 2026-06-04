import type {
  Token,
  ReadingPrefs,
  PunctuationIntensity,
  ChunkSize,
} from './types';
import { assertNever } from './types';

const MIN_DWELL = 40;
const MAX_DWELL = 4000;

const CHUNK_SCALE: Record<ChunkSize, number> = { 1: 1, 2: 1.5, 3: 1.9 };

function intensityFactor(i: PunctuationIntensity): number {
  switch (i) {
    case 'subtle':
      return 0.5;
    case 'standard':
      return 1.0;
    case 'strong':
      return 1.5;
    default:
      return assertNever(i);
  }
}

function basePunctuationMultiplier(tok: Token): number {
  if (tok.endsSection || tok.endsParagraph) return 2.5;
  switch (tok.trailingPunctuation) {
    case ',':
      return 1.5;
    case ';':
    case ':':
      return 1.75;
    case '.':
    case '!':
    case '?':
      return 2.0;
    default:
      return 1.0;
  }
}

function isLongWord(t: Token): boolean {
  return t.text.length > 8;
}

// Compute dwell for a chunk of 1..3 consecutive tokens.
export function dwellMs(chunk: Token[], prefs: ReadingPrefs): number {
  if (chunk.length === 0) return MIN_DWELL;
  const base = 60000 / Math.max(1, prefs.wpm);

  // Use the slowest token in the chunk to drive multipliers.
  let longMul = 1;
  let numMul = 1;
  let puncMul = 1;

  for (const t of chunk) {
    if (prefs.extraDwellLongWords && isLongWord(t)) longMul = Math.max(longMul, 1.15);
    if (prefs.extraDwellNumerals && t.isNumeric) numMul = Math.max(numMul, 1.2);
    if (prefs.punctuationPauses) {
      const raw = basePunctuationMultiplier(t);
      if (raw > 1) {
        const scaled = 1 + (raw - 1) * intensityFactor(prefs.punctuationIntensity);
        puncMul = Math.max(puncMul, scaled);
      }
    }
  }

  const chunkScale = CHUNK_SCALE[prefs.chunkSize];
  const total = base * longMul * numMul * puncMul * chunkScale;
  return Math.min(MAX_DWELL, Math.max(MIN_DWELL, total));
}

export const __test__ = { MIN_DWELL, MAX_DWELL, basePunctuationMultiplier, intensityFactor };