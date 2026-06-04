import { describe, it, expect } from 'vitest';
import { deriveTitle, looksLikeMarkdown, pasteProvider } from '../sources/pasteProvider';

describe('pasteProvider detection', () => {
  it('detects markdown by leading heading', () => {
    expect(looksLikeMarkdown('# Hello\n\nworld')).toBe(true);
    expect(looksLikeMarkdown('## sub')).toBe(true);
  });
  it('plain text otherwise', () => {
    expect(looksLikeMarkdown('Hello world\n\nNext para.')).toBe(false);
    expect(looksLikeMarkdown('not # a heading')).toBe(false);
  });
  it('derives title from first non-empty line, stripping hashes', () => {
    expect(deriveTitle('\n\n# A long title here\n\nbody')).toBe('A long title here');
    expect(deriveTitle('Plain first line\nsecond')).toBe('Plain first line');
    expect(deriveTitle('   ')).toBe('Pasted text');
  });
  it('loads as a SourceProvider', async () => {
    const p = pasteProvider('# Title\n\nbody words here');
    const doc = await p.load();
    expect(doc.tokens.length).toBeGreaterThan(0);
    expect(doc.title).toBe('Title');
  });
});