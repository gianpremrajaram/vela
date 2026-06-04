import type { SourceProvider } from './types';
import { tokeniseMarkdown, tokenisePlainText } from '../tokeniser';

/** Detect markdown loosely: starts with `# ` heading or contains a blank-line
 *  followed by a heading. The user prompt only requires the leading-`#` rule. */
export function looksLikeMarkdown(input: string): boolean {
  return /^\s*#{1,6}\s+\S/.test(input);
}

export function deriveTitle(input: string): string {
  const firstLine = input.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() ?? '';
  const cleaned = firstLine.replace(/^#{1,6}\s+/, '').slice(0, 80);
  return cleaned || 'Pasted text';
}

export function pasteProvider(input: string): SourceProvider {
  const title = deriveTitle(input);
  return {
    id: 'paste',
    label: title,
    load: async () =>
      looksLikeMarkdown(input)
        ? tokeniseMarkdown(input, title)
        : tokenisePlainText(input, title),
  };
}