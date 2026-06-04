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

function fontStack(f: Preferences['typography']['rsvp']['family']): string {
  switch (f) {
    case 'sans':
      return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    case 'serif':
      return 'ui-serif, "Iowan Old Style", Georgia, Cambria, "Times New Roman", serif';
    case 'mono':
      return 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace';
    case 'dyslexia':
      return '"OpenDyslexic", "Comic Sans MS", "Trebuchet MS", sans-serif';
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