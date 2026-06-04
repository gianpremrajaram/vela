import { describe, it, expect } from 'vitest';
import { tokenisePlainText, tokeniseMarkdown } from '../tokeniser';

describe('tokenisePlainText', () => {
  it('splits words and tracks trailing punctuation', () => {
    const doc = tokenisePlainText('Hello, world.');
    expect(doc.tokens.map((t) => t.text)).toEqual(['Hello', 'world']);
    expect(doc.tokens[0].trailingPunctuation).toBe(',');
    expect(doc.tokens[1].trailingPunctuation).toBe('.');
  });

  it('does not split sentences on abbreviations', () => {
    const doc = tokenisePlainText('Dr. Tinker, e.g., studied this. Next.');
    const sentenceIds = doc.tokens.map((t) => t.sentenceId);
    // "Dr. Tinker, e.g., studied this." is one sentence
    expect(sentenceIds[0]).toBe(0);
    expect(sentenceIds[1]).toBe(0);
    expect(sentenceIds[2]).toBe(0); // e.g.
    // last token (Next) should be in second sentence
    const last = doc.tokens[doc.tokens.length - 1];
    expect(last.text).toBe('Next');
    expect(last.sentenceId).toBeGreaterThan(0);
  });

  it('marks numerals', () => {
    const doc = tokenisePlainText('In 1961, there were 1,200 readers.');
    const yr = doc.tokens.find((t) => t.text.startsWith('1961'));
    expect(yr?.isNumeric).toBe(true);
  });

  it('paragraph boundaries flagged on last token of paragraph', () => {
    const doc = tokenisePlainText('One two.\n\nThree four.');
    const two = doc.tokens.find((t) => t.text === 'two')!;
    const four = doc.tokens.find((t) => t.text === 'four')!;
    expect(two.endsParagraph).toBe(true);
    expect(four.endsParagraph).toBe(true);
    expect(two.paragraphId).not.toBe(four.paragraphId);
  });
});

describe('tokeniseMarkdown', () => {
  it('parses headings into sections', () => {
    const doc = tokeniseMarkdown('# A\n\nbody one.\n\n## B\n\nbody two.\n\n## C\n\nbody three.');
    expect(doc.sections.length).toBe(3);
    expect(doc.sections.map((s) => s.title)).toEqual(['A', 'B', 'C']);
    expect(doc.sections[0].firstTokenId).toBe(0);
  });

  it('section ids on tokens match section order', () => {
    const doc = tokeniseMarkdown('# A\n\nalpha.\n\n## B\n\nbeta.');
    const alpha = doc.tokens.find((t) => t.text === 'alpha')!;
    const beta = doc.tokens.find((t) => t.text === 'beta')!;
    expect(alpha.sectionId).toBe(0);
    expect(beta.sectionId).toBe(1);
  });
});