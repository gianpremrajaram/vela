import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Preferences, Theme } from '@/core/types';
import { defaultPreferences, loadPreferences, savePreferences } from './storage';

type Updater = (prev: Preferences) => Preferences;

interface Ctx {
  prefs: Preferences;
  update(updater: Updater): void;
  set<K extends keyof Preferences>(key: K, value: Preferences[K]): void;
  reset(): void;
}

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-only).
  useEffect(() => {
    setPrefs(loadPreferences());
    setHydrated(true);
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (hydrated) savePreferences(prefs);
  }, [prefs, hydrated]);

  // Apply tokens + theme to <html>.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyTheme(prefs.appearance.theme);
    const root = document.documentElement;
    root.style.setProperty('--accent', prefs.appearance.accent);
    root.style.setProperty(
      '--anchor',
      prefs.anchor.colour === 'var(--accent)' ? prefs.appearance.accent : prefs.anchor.colour,
    );
    root.style.setProperty('--rsvp-font', fontStack(prefs.typography.rsvp.family));
    root.style.setProperty('--rsvp-size', sizePx(prefs.typography.rsvp.size, 'rsvp'));
    root.style.setProperty('--doc-font', fontStack(prefs.typography.document.family));
    root.style.setProperty('--doc-size', sizePx(prefs.typography.document.size, 'doc'));
    root.style.setProperty('--doc-line-height', lineHeightVal(prefs.typography.document.lineHeight));
  }, [prefs]);

  // React to system theme changes when theme = 'system'.
  useEffect(() => {
    if (prefs.appearance.theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.appearance.theme]);

  const update = useCallback((u: Updater) => setPrefs((p) => u(p)), []);
  const set = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);
  const reset = useCallback(() => setPrefs(defaultPreferences), []);

  const value = useMemo(() => ({ prefs, update, set, reset }), [prefs, update, set, reset]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

// Font stacks for the licence-safe (OFL/Apache) curated list.
// FOLLOW-UP (Claude Code): drop woff2 files under /public/fonts and add
// matching @font-face blocks so these names resolve to embedded fonts
// regardless of the user's OS. Until then, named families fall through to
// the system stack and only render with the chosen face if the user has
// it installed locally — perfectly acceptable for a scaffold.
const SYSTEM_SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM_SERIF = 'ui-serif, "Iowan Old Style", Georgia, Cambria, "Times New Roman", serif';
const SYSTEM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function fontStack(f: Preferences['typography']['rsvp']['family']): string {
  switch (f) {
    case 'system':
      return SYSTEM_SANS;
    // Sans
    case 'inter':
    case 'sans':
      return `"Inter", ${SYSTEM_SANS}`;
    case 'source-sans-3':
      return `"Source Sans 3", "Source Sans Pro", ${SYSTEM_SANS}`;
    case 'ibm-plex-sans':
      return `"IBM Plex Sans", ${SYSTEM_SANS}`;
    case 'work-sans':
      return `"Work Sans", ${SYSTEM_SANS}`;
    case 'public-sans':
      return `"Public Sans", ${SYSTEM_SANS}`;
    // Serif
    case 'source-serif-4':
    case 'serif':
      return `"Source Serif 4", "Source Serif Pro", ${SYSTEM_SERIF}`;
    case 'literata':
      return `"Literata", ${SYSTEM_SERIF}`;
    case 'newsreader':
      return `"Newsreader", ${SYSTEM_SERIF}`;
    case 'lora':
      return `"Lora", ${SYSTEM_SERIF}`;
    case 'ibm-plex-serif':
      return `"IBM Plex Serif", ${SYSTEM_SERIF}`;
    // Mono
    case 'jetbrains-mono':
    case 'mono':
      return `"JetBrains Mono", ${SYSTEM_MONO}`;
    case 'ibm-plex-mono':
      return `"IBM Plex Mono", ${SYSTEM_MONO}`;
    case 'source-code-pro':
      return `"Source Code Pro", ${SYSTEM_MONO}`;
    // Legibility
    case 'atkinson-hyperlegible':
      return `"Atkinson Hyperlegible", ${SYSTEM_SANS}`;
    case 'opendyslexic':
    case 'dyslexia':
      return `"OpenDyslexic", "Comic Sans MS", "Trebuchet MS", sans-serif`;
    default:
      return SYSTEM_SANS;
  }
}

function sizePx(s: Preferences['typography']['rsvp']['size'], kind: 'rsvp' | 'doc'): string {
  const rsvp = { S: '40px', M: '56px', L: '72px', XL: '96px' };
  const doc = { S: '15px', M: '17px', L: '19px', XL: '22px' };
  return (kind === 'rsvp' ? rsvp : doc)[s];
}

function lineHeightVal(lh: Preferences['typography']['document']['lineHeight']): string {
  return lh === 'compact' ? '1.4' : lh === 'relaxed' ? '1.85' : '1.6';
}