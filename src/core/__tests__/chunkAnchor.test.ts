import { describe, it, expect } from 'vitest';
import { chunkAnchor } from '../chunkAnchor';
import type { Token } from '../types';
import { anchorIndex } from '../orp';

function tok(raw: string, id = 0): Token {
  const text = raw.replace(/[.,;:!?]+$/, '');
  return {
    id,
    text,
    raw,
    anchorIndex: anchorIndex(text),
    trailingPunctuation: raw.length > text.length ? raw.slice(text.length) : '',
    isNumeric: /\d/.test(text),
    sentenceId: 0,
    paragraphId: 0,
    sectionId: 0,
    endsParagraph: false,
    endsSection: false,
  };
}

describe('chunkAnchor', () => {
  it('single word uses ORP pivot', () => {
    const r = chunkAnchor([tok('reading')], 1);
    expect(r.display).toBe('reading');
    expect(r.anchorIndex).toBe(anchorIndex('reading'));
  });

  it('joins multi-word chunk with a single space', () => {
    const r = chunkAnchor([tok('perhaps'), tok('subset,')], 2);
    expect(r.display).toBe('perhaps subset,');
  });

  it('picks character nearest midpoint for 2-word chunk', () => {
    const r = chunkAnchor([tok('cat'), tok('dog')], 2);
    expect(r.display[r.anchorIndex]).not.toMatch(/\s/);
  });

  it('3-word chunk anchors near centre', () => {
    const r = chunkAnchor([tok('the'), tok('quick'), tok('fox')], 3);
    expect(r.display).toBe('the quick fox');
    expect(r.display[r.anchorIndex]).not.toMatch(/\s/);
    expect(r.anchorIndex).toBeGreaterThan(2);
    expect(r.anchorIndex).toBeLessThan(r.display.length - 2);
  });

  it('returns empty for empty chunk', () => {
    expect(chunkAnchor([], 1)).toEqual({ display: '', anchorIndex: 0 });
  });
});