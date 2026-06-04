import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, ClipboardPaste, X } from 'lucide-react';
import { ACCEPT_ATTR, fileProvider, isSupportedFile } from '@/core/sources/fileProvider';
import { pasteProvider } from '@/core/sources/pasteProvider';
import type { DocumentModel } from '@/core/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose(): void;
  onLoaded(doc: DocumentModel): void;
}

type Tab = 'upload' | 'paste';

export function OpenDocumentModal({ open, onClose, onLoaded }: Props) {
  const [tab, setTab] = useState<Tab>('upload');
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setPasted('');
      setBusy(false);
      setDragging(false);
    }
  }, [open]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!isSupportedFile(file)) {
        setError('Unsupported file type. Use .pdf, .docx, .md, or .txt.');
        return;
      }
      setBusy(true);
      try {
        const doc = await fileProvider(file).load();
        onLoaded(doc);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not read that file.');
      } finally {
        setBusy(false);
      }
    },
    [onClose, onLoaded],
  );

  const handlePaste = useCallback(async () => {
    if (!pasted.trim()) {
      setError('Paste some text first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await pasteProvider(pasted).load();
      onLoaded(doc);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse that text.');
    } finally {
      setBusy(false);
    }
  }, [pasted, onClose, onLoaded]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        onClick={onClose}
        className="absolute inset-0"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-xl rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Open document</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted-fg)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[var(--line)] px-5 pt-3">
          {(['upload', 'paste'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors',
                tab === t
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted-fg)] hover:text-[var(--text)]',
              )}
            >
              {t === 'upload' ? <Upload size={14} /> : <ClipboardPaste size={14} />}
              {t === 'upload' ? 'Upload' : 'Paste'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors',
                dragging
                  ? 'border-[var(--accent)] bg-[var(--surface-2)]'
                  : 'border-[var(--line)] bg-[var(--surface-2)]/30',
              )}
            >
              <Upload size={24} className="mb-3 text-[var(--muted-fg)]" />
              <p className="text-sm text-[var(--text)]">Drag and drop a file here</p>
              <p className="mt-1 text-xs text-[var(--muted-fg)]">PDF, DOCX, Markdown, or plain text</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] hover:border-[var(--accent)]"
              >
                Choose file…
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste plain text or markdown here…"
                className="h-56 w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted-fg)] focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePaste}
                  className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  Read this
                </button>
              </div>
            </div>
          )}

          {busy && (
            <p className="mt-3 text-xs text-[var(--muted-fg)]">Reading document…</p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text)]">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}