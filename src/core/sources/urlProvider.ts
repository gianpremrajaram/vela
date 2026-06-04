// STUB: real URL fetching + readability extraction is delivered by Claude Code later.
import type { SourceProvider } from './types';

export const urlProvider: SourceProvider = {
  id: 'url',
  label: 'URL (coming soon)',
  load() {
    return Promise.reject(new Error('URL import is not implemented in this scaffold.'));
  },
};