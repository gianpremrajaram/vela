import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, FolderOpen, Pause, Play, Settings, SkipBack, SkipForward } from 'lucide-react';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { sampleProviders } from '@/core/sources/sampleProvider';
import type { SourceProvider } from '@/core/sources/types';
import { SegmentedControl } from './controls/SegmentedControl';
import type { Mode } from '@/core/types';
import { MODE_RANGES } from '@/core/types';
import { clampWpm, wpmToMode } from '@/core/wpmMode';

interface Props {
  isPlaying: boolean;
  wpm: number;
  onPlayToggle(): void;
  onSkip(n: number): void;
  onOpenSettings(): void;
  onOpenDocument(): void;
  onLoadSample(provider: SourceProvider): void;
}

const MODE_OPTS = [
  { value: 'comprehend' as const, label: 'Comprehend' },
  { value: 'accelerate' as const, label: 'Accelerate' },
  { value: 'skim' as const, label: 'Skim' },
];

export function TopBar({
  isPlaying,
  wpm,
  onPlayToggle,
  onSkip,
  onOpenSettings,
  onOpenDocument,
  onLoadSample,
}: Props) {
  const { prefs, update } = usePreferences();
  const [importOpen, setImportOpen] = useState(false);
  const [wpmDraft, setWpmDraft] = useState(String(wpm));
  const providers = sampleProviders();
  const importRef = useRef<HTMLDivElement>(null);

  // Keep the editable draft in sync when wpm changes externally (slider, mode click).
  useEffect(() => {
    setWpmDraft(String(wpm));
  }, [wpm]);

  useEffect(() => {
    if (!importOpen) return;
    const handler = (e: MouseEvent) => {
      if (importRef.current && !importRef.current.contains(e.target as Node)) setImportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [importOpen]);

  const setMode = (m: Mode) => {
    const r = MODE_RANGES[m];
    update((p) => ({ ...p, reading: { ...p.reading, mode: m, wpm: r.default } }));
  };

  const commitWpm = (raw: string) => {
    const n = clampWpm(Number(raw));
    update((p) => ({
      ...p,
      reading: { ...p.reading, wpm: n, mode: wpmToMode(n) },
    }));
    setWpmDraft(String(n));
  };

  // The visible mode highlight is derived from the live WPM, not the stored
  // mode — so dragging the slider or typing into the WPM box updates the chip.
  const derivedMode = wpmToMode(wpm);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--accent)]" />
          <span className="font-semibold tracking-tight text-[var(--text)]">Vela</span>
        </div>

        <button
          type="button"
          onClick={onOpenDocument}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          <FolderOpen size={14} /> Open
        </button>

        <div ref={importRef} className="relative">
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] hover:border-[var(--accent)]"
          >
            Open sample <ChevronDown size={14} />
          </button>
          {importOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-[var(--line)] bg-[var(--surface)] p-1 shadow-lg">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onLoadSample(p);
                    setImportOpen(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <SegmentedControl value={derivedMode} options={MODE_OPTS} onChange={setMode} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] p-1">
          <button
            type="button"
            aria-label="Skip back 10 words"
            onClick={() => onSkip(-10)}
            className="rounded p-1.5 text-[var(--muted-fg)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onPlayToggle}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-white hover:opacity-90"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            aria-label="Skip forward 10 words"
            onClick={() => onSkip(10)}
            className="rounded p-1.5 text-[var(--muted-fg)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <label className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm tabular-nums text-[var(--text)] focus-within:border-[var(--accent)]">
          <span className="text-[var(--muted-fg)]">WPM</span>
          <input
            type="number"
            min={100}
            max={1200}
            step={10}
            value={wpmDraft}
            onChange={(e) => setWpmDraft(e.target.value)}
            onBlur={(e) => commitWpm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-14 bg-transparent text-right outline-none tabular-nums"
            aria-label="Words per minute"
          />
        </label>

        <button
          type="button"
          aria-label="Open settings"
          onClick={onOpenSettings}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--muted-fg)] hover:text-[var(--text)] hover:border-[var(--accent)]"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}