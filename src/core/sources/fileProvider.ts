import type { DocumentModel } from '../types';
import type { SourceProvider } from './types';
import { tokeniseMarkdown, tokenisePlainText } from '../tokeniser';
import { looksLikeMarkdown } from './pasteProvider';

function baseTitle(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

async function readText(file: File): Promise<string> {
  return await file.text();
}

async function readDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({ arrayBuffer });
  return result.value ?? '';
}

// FOLLOW-UP (Claude Code): column-aware reading order for multi-column
// academic PDFs. The naive concat below works fine for single-column docs.
async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Vite-friendly worker URL — bundles the worker rather than fetching at runtime.
  const workerUrl = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default as string;
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: unknown) => (it as { str?: string }).str ?? '')
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}

export type SupportedExt = 'txt' | 'md' | 'docx' | 'pdf';

function extOf(name: string): SupportedExt | null {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return null;
  const e = m[1];
  if (e === 'txt' || e === 'md' || e === 'docx' || e === 'pdf') return e;
  return null;
}

export function fileProvider(file: File): SourceProvider {
  const title = baseTitle(file.name);
  return {
    id: `file:${file.name}`,
    label: title,
    async load(): Promise<DocumentModel> {
      const ext = extOf(file.name);
      if (!ext) {
        throw new Error('Unsupported file type. Use .pdf, .docx, .md, or .txt.');
      }
      let text: string;
      switch (ext) {
        case 'txt':
        case 'md':
          text = await readText(file);
          break;
        case 'docx':
          text = await readDocx(file);
          break;
        case 'pdf':
          text = await readPdf(file);
          break;
      }
      const isMd = ext === 'md' || looksLikeMarkdown(text);
      return isMd ? tokeniseMarkdown(text, title) : tokenisePlainText(text, title);
    },
  };
}

export const ACCEPT_ATTR = '.pdf,.docx,.md,.txt';

export function isSupportedFile(file: File): boolean {
  return extOf(file.name) !== null;
}