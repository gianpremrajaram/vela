import type { DocumentModel } from '../types';

export interface SourceProvider {
  id: string;
  label: string;
  load(): Promise<DocumentModel>;
}