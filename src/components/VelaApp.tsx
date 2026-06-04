import { useCallback, useEffect, useState } from 'react';
import { PreferencesProvider, usePreferences } from '@/lib/preferences/PreferencesContext';
import { useReader } from '@/lib/reader/useReader';
import { sampleProviders } from '@/core/sources/sampleProvider';
import type { DocumentModel } from '@/core/types';
import type { SourceProvider } from '@/core/sources/types';
import { TopBar } from './TopBar';
import { SplitPane } from './SplitPane';
import { RSVPStage } from './RSVPStage';
import { SourcePane } from './SourcePane';
import { SettingsDrawer } from './SettingsDrawer';
import { KeyboardShortcuts } from './KeyboardShortcuts';

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
  const { snapshot, controls } = useReader(doc);

  // Load the first sample on first mount so the UI is interactive immediately.
  useEffect(() => {
    if (doc) return;
    void sampleProviders()[0].load().then(setDoc);
  }, [doc]);

  const onLoadSample = useCallback((p: SourceProvider) => {
    void p.load().then(setDoc);
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

      <KeyboardShortcuts
        onToggle={() => controls.toggle()}
        onSkip={(n) => controls.skip(n)}
        onWpmDelta={onWpmDelta}
        onPause={() => controls.pause()}
      />
    </div>
  );
}