import { X } from 'lucide-react';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { PreferenceGroup } from './controls/PreferenceGroup';
import { PreferenceRow } from './controls/PreferenceRow';
import { Toggle } from './controls/Toggle';
import { Slider } from './controls/Slider';
import { SegmentedControl } from './controls/SegmentedControl';
import { Select } from './controls/Select';
import { ColourSwatch } from './controls/ColourSwatch';
import type {
  AnchorWeight,
  ChunkSize,
  CurrentWordIndicator,
  FontFamily,
  FontSize,
  LineHeight,
  Mode,
  PunctuationIntensity,
  ReadTreatment,
  Theme,
  UnderlineThickness,
} from '@/core/types';
import { MODE_RANGES } from '@/core/types';
import { cn } from '@/lib/utils';

const FONT_OPTS: ReadonlyArray<{ value: FontFamily; label: string }> = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
  { value: 'dyslexia', label: 'Dyslexia' },
];
const SIZE_OPTS: ReadonlyArray<{ value: FontSize; label: string }> = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
];
const LH_OPTS: ReadonlyArray<{ value: LineHeight; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
];
const MODE_OPTS: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: 'comprehend', label: 'Comprehend' },
  { value: 'accelerate', label: 'Accelerate' },
  { value: 'skim', label: 'Skim' },
];
const CHUNK_OPTS: ReadonlyArray<{ value: '1' | '2' | '3'; label: string }> = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];
const INTENSITY_OPTS: ReadonlyArray<{ value: PunctuationIntensity; label: string }> = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'standard', label: 'Standard' },
  { value: 'strong', label: 'Strong' },
];
const ANCHOR_WEIGHT_OPTS: ReadonlyArray<{ value: AnchorWeight; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
];
const INDICATOR_OPTS: ReadonlyArray<{ value: CurrentWordIndicator; label: string }> = [
  { value: 'underline', label: 'Underline' },
  { value: 'highlight', label: 'Highlight' },
];
const UTHICK_OPTS: ReadonlyArray<{ value: UnderlineThickness; label: string }> = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'thick', label: 'Thick' },
];
const READ_OPTS: ReadonlyArray<{ value: ReadTreatment; label: string }> = [
  { value: 'fade', label: 'Fade' },
  { value: 'dim', label: 'Dim' },
  { value: 'none', label: 'None' },
];
const THEME_OPTS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const ACCENT_PRESETS = ['#2f7a78', '#5b6cff', '#8c6dd0', '#6b8e23', '#b06a3b', '#3a3a3a'];
const ANCHOR_PRESETS = ['var(--accent)', '#2f7a78', '#5b6cff', '#b06a3b', '#3a3a3a'];

interface Props {
  open: boolean;
  onClose(): void;
}

export function SettingsDrawer({ open, onClose }: Props) {
  const { prefs, update, reset } = usePreferences();
  const range = MODE_RANGES[prefs.reading.mode];

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
          prefs.appearance.reducedMotion && 'transition-none',
        )}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-[var(--line)] bg-[var(--surface)] shadow-xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
          prefs.appearance.reducedMotion && 'transition-none',
        )}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Preferences</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--muted-fg)] hover:text-[var(--text)]"
            >
              Reset
            </button>
            <button
              type="button"
              aria-label="Close settings"
              onClick={onClose}
              className="rounded p-1 text-[var(--muted-fg)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          <PreferenceGroup title="Reading">
            <PreferenceRow label="Mode" description={`Range ${range.min}–${range.max} wpm`}>
              <SegmentedControl
                value={prefs.reading.mode}
                options={MODE_OPTS}
                onChange={(m) =>
                  update((p) => ({
                    ...p,
                    reading: { ...p.reading, mode: m, wpm: MODE_RANGES[m].default },
                  }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Words per minute" description={`${prefs.reading.wpm} wpm`}>
              <div className="w-44">
                <Slider
                  min={100}
                  max={1200}
                  step={10}
                  value={prefs.reading.wpm}
                  onChange={(v) =>
                    update((p) => ({ ...p, reading: { ...p.reading, wpm: v } }))
                  }
                />
              </div>
            </PreferenceRow>
            {prefs.reading.academicCapWarning && prefs.reading.wpm > 500 && (
              <div className="my-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted-fg)]">
                Above 500 wpm, comprehension typically drops on dense or technical material.
              </div>
            )}
            <PreferenceRow label="Chunk size" description="Words per flash">
              <SegmentedControl
                value={String(prefs.reading.chunkSize) as '1' | '2' | '3'}
                options={CHUNK_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    reading: { ...p.reading, chunkSize: Number(v) as ChunkSize },
                  }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Punctuation pauses">
              <Toggle
                checked={prefs.reading.punctuationPauses}
                onChange={(v) =>
                  update((p) => ({ ...p, reading: { ...p.reading, punctuationPauses: v } }))
                }
              />
            </PreferenceRow>
            {prefs.reading.punctuationPauses && (
              <PreferenceRow label="Pause intensity">
                <SegmentedControl
                  value={prefs.reading.punctuationIntensity}
                  options={INTENSITY_OPTS}
                  onChange={(v) =>
                    update((p) => ({
                      ...p,
                      reading: { ...p.reading, punctuationIntensity: v },
                    }))
                  }
                />
              </PreferenceRow>
            )}
            <PreferenceRow label="Extra dwell on long words">
              <Toggle
                checked={prefs.reading.extraDwellLongWords}
                onChange={(v) =>
                  update((p) => ({ ...p, reading: { ...p.reading, extraDwellLongWords: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Extra dwell on numerals">
              <Toggle
                checked={prefs.reading.extraDwellNumerals}
                onChange={(v) =>
                  update((p) => ({ ...p, reading: { ...p.reading, extraDwellNumerals: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Warn above 500 wpm">
              <Toggle
                checked={prefs.reading.academicCapWarning}
                onChange={(v) =>
                  update((p) => ({ ...p, reading: { ...p.reading, academicCapWarning: v } }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>

          <PreferenceGroup title="Anchor">
            <PreferenceRow label="Show anchor letter">
              <Toggle
                checked={prefs.anchor.enabled}
                onChange={(v) => update((p) => ({ ...p, anchor: { ...p.anchor, enabled: v } }))}
              />
            </PreferenceRow>
            <PreferenceRow label="Colour">
              <ColourSwatch
                value={prefs.anchor.colour}
                presets={ANCHOR_PRESETS}
                onChange={(v) =>
                  update((p) => ({ ...p, anchor: { ...p.anchor, colour: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Weight">
              <SegmentedControl
                value={prefs.anchor.weight}
                options={ANCHOR_WEIGHT_OPTS}
                onChange={(v) =>
                  update((p) => ({ ...p, anchor: { ...p.anchor, weight: v } }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>

          <PreferenceGroup title="Typography — RSVP stage">
            <PreferenceRow label="Font family">
              <Select
                value={prefs.typography.rsvp.family}
                options={FONT_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    typography: { ...p.typography, rsvp: { ...p.typography.rsvp, family: v } },
                  }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Font size">
              <SegmentedControl
                value={prefs.typography.rsvp.size}
                options={SIZE_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    typography: { ...p.typography, rsvp: { ...p.typography.rsvp, size: v } },
                  }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>

          <PreferenceGroup title="Typography — Source document">
            <PreferenceRow label="Font family">
              <Select
                value={prefs.typography.document.family}
                options={FONT_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    typography: {
                      ...p.typography,
                      document: { ...p.typography.document, family: v },
                    },
                  }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Font size">
              <SegmentedControl
                value={prefs.typography.document.size}
                options={SIZE_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    typography: {
                      ...p.typography,
                      document: { ...p.typography.document, size: v },
                    },
                  }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Line height">
              <SegmentedControl
                value={prefs.typography.document.lineHeight}
                options={LH_OPTS}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    typography: {
                      ...p.typography,
                      document: { ...p.typography.document, lineHeight: v },
                    },
                  }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>

          <PreferenceGroup title="Source pane">
            <PreferenceRow label="Current word">
              <SegmentedControl
                value={prefs.source.currentWordIndicator}
                options={INDICATOR_OPTS}
                onChange={(v) =>
                  update((p) => ({ ...p, source: { ...p.source, currentWordIndicator: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Underline thickness">
              <SegmentedControl
                value={prefs.source.underlineThickness}
                options={UTHICK_OPTS}
                onChange={(v) =>
                  update((p) => ({ ...p, source: { ...p.source, underlineThickness: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Read-word treatment">
              <SegmentedControl
                value={prefs.source.readTreatment}
                options={READ_OPTS}
                onChange={(v) =>
                  update((p) => ({ ...p, source: { ...p.source, readTreatment: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Show section chips">
              <Toggle
                checked={prefs.source.showSectionChips}
                onChange={(v) =>
                  update((p) => ({ ...p, source: { ...p.source, showSectionChips: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Auto-scroll to read-head">
              <Toggle
                checked={prefs.source.autoScroll}
                onChange={(v) =>
                  update((p) => ({ ...p, source: { ...p.source, autoScroll: v } }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>

          <PreferenceGroup title="Appearance">
            <PreferenceRow label="Theme">
              <SegmentedControl
                value={prefs.appearance.theme}
                options={THEME_OPTS}
                onChange={(v) =>
                  update((p) => ({ ...p, appearance: { ...p.appearance, theme: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Accent colour">
              <ColourSwatch
                value={prefs.appearance.accent}
                presets={ACCENT_PRESETS}
                onChange={(v) =>
                  update((p) => ({ ...p, appearance: { ...p.appearance, accent: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow
              label="Split ratio"
              description={`${Math.round(prefs.appearance.splitRatio * 100)}% reading stage`}
            >
              <div className="w-44">
                <Slider
                  min={30}
                  max={85}
                  value={Math.round(prefs.appearance.splitRatio * 100)}
                  onChange={(v) =>
                    update((p) => ({ ...p, appearance: { ...p.appearance, splitRatio: v / 100 } }))
                  }
                />
              </div>
            </PreferenceRow>
            <PreferenceRow label="Show progress bar">
              <Toggle
                checked={prefs.appearance.showProgressBar}
                onChange={(v) =>
                  update((p) => ({ ...p, appearance: { ...p.appearance, showProgressBar: v } }))
                }
              />
            </PreferenceRow>
            <PreferenceRow label="Reduced motion">
              <Toggle
                checked={prefs.appearance.reducedMotion}
                onChange={(v) =>
                  update((p) => ({ ...p, appearance: { ...p.appearance, reducedMotion: v } }))
                }
              />
            </PreferenceRow>
          </PreferenceGroup>
        </div>
      </aside>
    </>
  );
}