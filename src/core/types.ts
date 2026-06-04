// Pure types. No React, no DOM. These are the stable contracts.

export type Mode = 'comprehend' | 'accelerate' | 'skim';
export type ChunkSize = 1 | 2 | 3;
export type PunctuationIntensity = 'subtle' | 'standard' | 'strong';
export type Theme = 'light' | 'dark' | 'system';
export type FontFamily = 'sans' | 'serif' | 'mono' | 'dyslexia';
export type FontSize = 'S' | 'M' | 'L' | 'XL';
export type LineHeight = 'compact' | 'normal' | 'relaxed';
export type AnchorWeight = 'normal' | 'bold';
export type CurrentWordIndicator = 'underline' | 'highlight';
export type UnderlineThickness = 'thin' | 'medium' | 'thick';
export type ReadTreatment = 'fade' | 'dim' | 'none';

export interface Token {
  id: number;
  text: string; // word without trailing punctuation
  raw: string; // text + trailing punctuation, no leading whitespace
  anchorIndex: number; // 0-based index into `text`
  trailingPunctuation: string; // '', ',', '.', ';', ':', '!', '?'
  isNumeric: boolean;
  sentenceId: number;
  paragraphId: number;
  sectionId: number;
  endsParagraph: boolean;
  endsSection: boolean;
}

export interface Section {
  id: number;
  title: string;
  level: 1 | 2 | 3;
  firstTokenId: number;
}

export interface DocumentModel {
  id: string;
  title: string;
  tokens: Token[];
  sections: Section[];
}

export interface ReaderState {
  index: number; // current token id
  isPlaying: boolean;
  wpm: number;
}

// --- Preferences (full toggleability layer) ---

export interface ReadingPrefs {
  mode: Mode;
  wpm: number;
  chunkSize: ChunkSize;
  punctuationPauses: boolean;
  punctuationIntensity: PunctuationIntensity;
  extraDwellLongWords: boolean;
  extraDwellNumerals: boolean;
  academicCapWarning: boolean;
}

export interface AnchorPrefs {
  enabled: boolean;
  colour: string; // CSS colour string
  weight: AnchorWeight;
}

export interface TypographyPanePrefs {
  family: FontFamily;
  size: FontSize;
}

export interface TypographyPrefs {
  rsvp: TypographyPanePrefs;
  document: TypographyPanePrefs & { lineHeight: LineHeight };
}

export interface SourcePanePrefs {
  currentWordIndicator: CurrentWordIndicator;
  underlineThickness: UnderlineThickness;
  readTreatment: ReadTreatment;
  showSectionChips: boolean;
  autoScroll: boolean;
}

export interface AppearancePrefs {
  theme: Theme;
  accent: string;
  splitRatio: number; // 0.2..0.8 (left fraction)
  showProgressBar: boolean;
  reducedMotion: boolean;
}

export interface Preferences {
  reading: ReadingPrefs;
  anchor: AnchorPrefs;
  typography: TypographyPrefs;
  source: SourcePanePrefs;
  appearance: AppearancePrefs;
}

export const MODE_RANGES: Record<Mode, { min: number; max: number; default: number }> = {
  comprehend: { min: 150, max: 350, default: 250 },
  accelerate: { min: 350, max: 600, default: 450 },
  skim: { min: 600, max: 1200, default: 800 },
};

export function assertNever(x: never): never {
  throw new Error('Unexpected variant: ' + JSON.stringify(x));
}