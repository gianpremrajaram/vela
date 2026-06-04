import type { Preferences } from '@/core/types';

export const STORAGE_KEY = 'vela.preferences.v1';

export const defaultPreferences: Preferences = {
  reading: {
    mode: 'comprehend',
    wpm: 250,
    chunkSize: 1,
    punctuationPauses: true,
    punctuationIntensity: 'standard',
    extraDwellLongWords: true,
    extraDwellNumerals: true,
    academicCapWarning: true,
  },
  anchor: {
    enabled: true,
    colour: 'var(--accent)',
    weight: 'bold',
    focusGuide: true,
  },
  typography: {
    rsvp: { family: 'sans', size: 'XL' },
    document: { family: 'serif', size: 'M', lineHeight: 'normal' },
  },
  source: {
    currentWordIndicator: 'underline',
    underlineThickness: 'medium',
    readTreatment: 'fade',
    showSectionChips: true,
    autoScroll: true,
  },
  appearance: {
    theme: 'system',
    accent: '#2f7a78', // restrained slate-teal, not red
    splitRatio: 0.67,
    showProgressBar: true,
    reducedMotion: false,
  },
};

function deepMerge<T>(base: T, patch: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return (patch as T) ?? base;
  }
  if (typeof patch !== 'object' || patch === null) return base;
  const out = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(base as Record<string, unknown>)) {
    if (k in (patch as Record<string, unknown>)) {
      out[k] = deepMerge((base as Record<string, unknown>)[k], (patch as Record<string, unknown>)[k]) as unknown;
    }
  }
  return out as T;
}

export function loadPreferences(): Preferences {
  if (typeof localStorage === 'undefined') return defaultPreferences;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw);
    return deepMerge(defaultPreferences, parsed);
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}