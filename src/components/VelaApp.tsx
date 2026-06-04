import { useCallback, useEffect, useState } from 'react';
import { PreferencesProvider, usePreferences } from '@/lib/preferences/PreferencesContext';
import { useReader } from '@/lib/reader/useReader';
import { sampleProviders } from '@/core/sources/sampleProvider';
import { fileProvider, isSupportedFile } from '@/core/sources/fileProvider';
import type { DocumentModel } from '@/core/types';
import type { SourceProvider } from '@/core/sources/types';
import { TopBar } from './TopBar';
import { SplitPane } from './SplitPane';
import { RSVPStage } from './RSVPStage';
import { SourcePane } from './SourcePane';
import { SettingsDrawer } from './SettingsDrawer';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { OpenDocumentModal } from './OpenDocumentModal';

export function VelaApp() {
  return (
    <PreferencesProvider>
      <VelaShell />
    </PreferencesProvider>
  );
}

function VelaShell() {
  const { prefs, update } = usePreferences();
  const [doc, setDoc] = useState<DocumentModel | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openDocOpen, setOpenDocOpen] = useState(false);
  const [dropOverlay, setDropOverlay] = useState(false);
  const { snapshot, controls, runStart } = useReader(doc);

  // Load the first sample on first mount so the UI is interactive immediately.
  useEffect(() => {
    if (doc) return;
    void sampleProviders()[0].load().then(setDoc);
  }, [doc]);

  const onLoadSample = useCallback((p: SourceProvider) => {
    void p.load().then(setDoc);
  }, []);

  // Window-wide drag-and-drop. Any file dropped anywhere on the shell loads
  // through fileProvider; unsupported types are silently ignored (the modal
  // shows the same error if used).
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      setDropOverlay(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.nodeName === 'HTML') setDropOverlay(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDropOverlay(false);
      const f = e.dataTransfer?.files?.[0];
      if (!f || !isSupportedFile(f)) return;
      void fileProvider(f).load().then(setDoc).catch(() => undefined);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const onSeekFraction = useCallback(
    (f: number) => {
      if (!doc) return;
      controls.seek(Math.round(f * doc.tokens.length));
    },
    [doc, controls],
  );

  const onWpmDelta = useCallback(
    (d: number) => {
      update((p) => ({
        ...p,
        reading: { ...p.reading, wpm: Math.max(100, Math.min(1200, p.reading.wpm + d)) },
      }));
    },
    [update],
  );

  const isPlaying = snapshot?.state.isPlaying ?? false;
  const currentIndex = snapshot?.state.index ?? 0;
  const progress = snapshot?.progress ?? 0;

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      <TopBar
        isPlaying={isPlaying}
        wpm={prefs.reading.wpm}
        onPlayToggle={() => controls.toggle()}
        onSkip={(n) => controls.skip(n)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDocument={() => setOpenDocOpen(true)}
        onLoadSample={onLoadSample}
      />

      <main className="min-h-0 flex-1">
        {doc ? (
          <SplitPane
            ratio={prefs.appearance.splitRatio}
            onRatioChange={(r) =>
              update((p) => ({ ...p, appearance: { ...p.appearance, splitRatio: r } }))
            }
            left={
              <div className="flex h-full w-full items-center justify-center bg-[var(--bg)] px-8">
                <RSVPStage
                  chunk={snapshot?.currentChunk ?? []}
                  progress={progress}
                  totalTokens={doc.tokens.length}
                  currentIndex={currentIndex}
                  onSeekFraction={onSeekFraction}
                />
              </div>
            }
            right={
              <SourcePane
                doc={doc}
                currentIndex={currentIndex}
                runStart={runStart}
                onSeek={(id) => controls.seek(id)}
              />
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--muted-fg)]">
            Loading sample…
          </div>
        )}
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <OpenDocumentModal
        open={openDocOpen}
        onClose={() => setOpenDocOpen(false)}
        onLoaded={setDoc}
      />

      {dropOverlay && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[var(--accent)]/15 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-[var(--accent)] bg-[var(--surface)] px-8 py-6 text-sm text-[var(--text)] shadow-lg">
            Drop a PDF, DOCX, Markdown or text file to read it
          </div>
        </div>
      )}

      <KeyboardShortcuts
        onToggle={() => controls.toggle()}
        onSkip={(n) => controls.skip(n)}
        onWpmDelta={onWpmDelta}
        onPause={() => controls.pause()}
      />
    </div>
  );
}