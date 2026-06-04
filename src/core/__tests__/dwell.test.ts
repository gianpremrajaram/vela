import { describe, it, expect } from 'vitest';
import { dwellMs } from '../dwell';
import type { ReadingPrefs, Token } from '../types';

const basePrefs: ReadingPrefs = {
  mode: 'comprehend',
  wpm: 300,
  chunkSize: 1,
  punctuationPauses: true,
  punctuationIntensity: 'standard',
  extraDwellLongWords: true,
  extraDwellNumerals: true,
  academicCapWarning: true,
};

function tok(over: Partial<Token> = {}): Token {
  return {
    id: 0,
    text: 'word',
    raw: 'word',
    anchorIndex: 1,
    trailingPunctuation: '',
    isNumeric: false,
    sentenceId: 0,
    paragraphId: 0,
    sectionId: 0,
    endsParagraph: false,
    endsSection: false,
    ...over,
  };
}

describe('dwellMs', () => {
  it('base from WPM (60000/wpm)', () => {
    expect(dwellMs([tok()], basePrefs)).toBeCloseTo(200, 5);
  });

  it('comma -> 1.5x at standard intensity', () => {
    expect(dwellMs([tok({ trailingPunctuation: ',' })], basePrefs)).toBeCloseTo(300, 5);
  });

  it('full stop -> 2.0x at standard', () => {
    expect(dwellMs([tok({ trailingPunctuation: '.' })], basePrefs)).toBeCloseTo(400, 5);
  });

  it('subtle intensity halves the extra', () => {
    const p = { ...basePrefs, punctuationIntensity: 'subtle' as const };
    // comma: base 1 + (1.5 - 1) * 0.5 = 1.25
    expect(dwellMs([tok({ trailingPunctuation: ',' })], p)).toBeCloseTo(250, 5);
  });

  it('strong intensity raises the extra', () => {
    const p = { ...basePrefs, punctuationIntensity: 'strong' as const };
    // full stop: 1 + (2 - 1) * 1.5 = 2.5
    expect(dwellMs([tok({ trailingPunctuation: '.' })], p)).toBeCloseTo(500, 5);
  });

  it('long words add 15%', () => {
    expect(dwellMs([tok({ text: 'magnificent' })], basePrefs)).toBeCloseTo(230, 5);
  });

  it('numerals add 20%', () => {
    expect(dwellMs([tok({ text: '1961', isNumeric: true })], basePrefs)).toBeCloseTo(240, 5);
  });

  it('punctuation pauses can be disabled', () => {
    const p = { ...basePrefs, punctuationPauses: false };
    expect(dwellMs([tok({ trailingPunctuation: '.' })], p)).toBeCloseTo(200, 5);
  });

  it('chunk size 2 scales by 1.5', () => {
    const p = { ...basePrefs, chunkSize: 2 as const };
    expect(dwellMs([tok(), tok()], p)).toBeCloseTo(300, 5);
  });

  it('chunk uses slowest token multiplier', () => {
    const p = { ...basePrefs, chunkSize: 2 as const };
    // base 200 * full-stop 2.0 * chunk 1.5 = 600
    expect(
      dwellMs([tok(), tok({ trailingPunctuation: '.' })], p),
    ).toBeCloseTo(600, 5);
  });

  it('paragraph boundary -> 2.5x', () => {
    expect(dwellMs([tok({ endsParagraph: true })], basePrefs)).toBeCloseTo(500, 5);
  });

  it('clamps to >= 40ms', () => {
    expect(dwellMs([tok()], { ...basePrefs, wpm: 99999 })).toBeGreaterThanOrEqual(40);
  });

  it('clamps to <= 4000ms', () => {
    expect(dwellMs([tok({ endsSection: true })], { ...basePrefs, wpm: 100 })).toBeLessThanOrEqual(4000);
  });
});