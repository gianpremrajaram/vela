import { describe, it, expect } from 'vitest';
import { anchorIndex } from '../orp';

describe('anchorIndex pivot table', () => {
  const cases: Array<[string, number]> = [
    ['a', 0],
    ['to', 1],
    ['the', 1],
    ['five', 1],
    ['sixly', 1],
    ['salmon', 2],
    ['readers', 2],
    ['paragraph', 2],
    ['characters', 3],
    ['comprehension', 3],
    ['internationalise', 4],
    ['antidisestablishment', 4],
  ];
  for (const [word, expected] of cases) {
    it(`${word} (len ${word.length}) -> ${expected}`, () => {
      expect(anchorIndex(word)).toBe(expected);
    });
  }

  it('strips leading punctuation', () => {
    expect(anchorIndex('"hello')).toBe(anchorIndex('hello'));
    expect(anchorIndex('(world)')).toBe(anchorIndex('world)'));
  });

  it('empty / single char', () => {
    expect(anchorIndex('')).toBe(0);
    expect(anchorIndex('x')).toBe(0);
  });
});