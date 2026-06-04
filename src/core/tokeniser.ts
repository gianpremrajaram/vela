import type { DocumentModel, Token, Section } from './types';
import { anchorIndex, trimLeading } from './orp';

const ABBREVIATIONS = new Set([
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'prof.',
  'st.',
  'jr.',
  'sr.',
  'e.g.',
  'i.e.',
  'etc.',
  'vs.',
  'cf.',
  'no.',
]);

const TRAILING_PUNCT_RE = /([.,;:!?])+$/;
const NUMERIC_RE = /\d/;

interface Acc {
  tokens: Token[];
  sections: Section[];
  sentenceId: number;
  paragraphId: number;
  sectionId: number;
  nextTokenId: number;
}

function newAcc(): Acc {
  return {
    tokens: [],
    sections: [{ id: 0, title: 'Introduction', level: 1, firstTokenId: 0 }],
    sentenceId: 0,
    paragraphId: 0,
    sectionId: 0,
    nextTokenId: 0,
  };
}

function pushToken(acc: Acc, raw: string): Token | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(TRAILING_PUNCT_RE);
  const trailing = m ? m[0][m[0].length - 1] : '';
  const text = trimLeading(trimmed.replace(TRAILING_PUNCT_RE, ''));
  if (!text) return null;
  const tok: Token = {
    id: acc.nextTokenId++,
    text,
    raw: trimmed,
    anchorIndex: anchorIndex(text),
    trailingPunctuation: trailing,
    isNumeric: NUMERIC_RE.test(text),
    sentenceId: acc.sentenceId,
    paragraphId: acc.paragraphId,
    sectionId: acc.sectionId,
    endsParagraph: false,
    endsSection: false,
  };
  acc.tokens.push(tok);
  return tok;
}

function endSentenceMaybe(acc: Acc, tok: Token | null) {
  if (!tok) return;
  const lower = tok.raw.toLowerCase();
  if (ABBREVIATIONS.has(lower)) return;
  if (/[.!?]$/.test(tok.trailingPunctuation)) acc.sentenceId++;
}

function tokeniseParagraph(acc: Acc, text: string) {
  const firstTokenId = acc.nextTokenId;
  // split on whitespace
  const words = text.split(/\s+/).filter(Boolean);
  let last: Token | null = null;
  for (const w of words) {
    const t = pushToken(acc, w);
    if (t) {
      endSentenceMaybe(acc, t);
      last = t;
    }
  }
  if (last) last.endsParagraph = true;
  acc.paragraphId++;
  return { firstTokenId, lastToken: last };
}

function finaliseTokens(acc: Acc) {
  // Mark last token of section
  for (let i = 0; i < acc.sections.length; i++) {
    const next = acc.sections[i + 1];
    const lastId = next ? next.firstTokenId - 1 : acc.tokens.length - 1;
    if (lastId >= 0 && acc.tokens[lastId]) acc.tokens[lastId].endsSection = true;
  }
}

export function tokenisePlainText(input: string, title = 'Untitled'): DocumentModel {
  const acc = newAcc();
  const paragraphs = input.split(/\n\s*\n/);
  for (const p of paragraphs) {
    tokeniseParagraph(acc, p);
  }
  finaliseTokens(acc);
  return { id: cryptoSafeId(title), title, tokens: acc.tokens, sections: acc.sections };
}

const HEADING_RE = /^(#{1,3})\s+(.+)$/;

export function tokeniseMarkdown(input: string, title = 'Untitled'): DocumentModel {
  const acc = newAcc();
  // Start with default intro section; replace once we see a top-level heading.
  let sawHeading = false;

  const lines = input.split(/\r?\n/);
  let buffer: string[] = [];

  const flushPara = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ');
    buffer = [];
    if (text.trim()) tokeniseParagraph(acc, text);
  };

  for (const line of lines) {
    const h = line.match(HEADING_RE);
    if (h) {
      flushPara();
      acc.sectionId = acc.sections.length;
      // First heading overrides the default intro placeholder if no tokens yet.
      if (!sawHeading && acc.tokens.length === 0) {
        acc.sections = [];
        acc.sectionId = 0;
      }
      acc.sections.push({
        id: acc.sectionId,
        title: h[2].trim(),
        level: h[1].length as 1 | 2 | 3,
        firstTokenId: acc.nextTokenId,
      });
      sawHeading = true;
      // Also push heading words as readable tokens at the start of section.
      tokeniseParagraph(acc, h[2].trim());
      continue;
    }
    if (line.trim() === '') {
      flushPara();
    } else {
      buffer.push(line.trim());
    }
  }
  flushPara();
  finaliseTokens(acc);
  return { id: cryptoSafeId(title), title, tokens: acc.tokens, sections: acc.sections };
}

function cryptoSafeId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return 'doc-' + Math.abs(h).toString(36);
}