import type { SourceProvider } from './types';
import { tokeniseMarkdown, tokenisePlainText } from '../tokeniser';
import { articleSample } from '../fixtures/article';
import { academicSample } from '../fixtures/academic';
import { longformSample } from '../fixtures/longform';

interface Sample {
  id: string;
  title: string;
  body: string;
  markdown?: boolean;
}

export const samples: Sample[] = [
  { ...articleSample },
  { ...academicSample, markdown: true },
  { ...longformSample },
];

export function sampleProviders(): SourceProvider[] {
  return samples.map((s) => ({
    id: s.id,
    label: s.title,
    load: async () =>
      s.markdown ? tokeniseMarkdown(s.body, s.title) : tokenisePlainText(s.body, s.title),
  }));
}