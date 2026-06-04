// STUB: real PDF reading-order parsing is delivered by Claude Code later.
import type { SourceProvider } from './types';

export const pdfProvider: SourceProvider = {
  id: 'pdf',
  label: 'PDF (coming soon)',
  load() {
    return Promise.reject(new Error('PDF import is not implemented in this scaffold.'));
  },
};