import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentModel } from '@/core/types';
import { createEngine, type Engine, type EngineSnapshot } from '@/core/engine';
import { usePreferences } from '@/lib/preferences/PreferencesContext';

export function useReader(doc: DocumentModel | null) {
  const { prefs } = usePreferences();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const engineRef = useRef<Engine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);

  // Recreate engine when document changes.
  useEffect(() => {
    if (!doc) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setSnapshot(null);
      return;
    }
    const eng = createEngine({
      doc,
      prefs: prefsRef.current,
      onTick: (snap) => setSnapshot(snap),
    });
    engineRef.current = eng;
    setSnapshot(eng.getSnapshot());
    return () => eng.dispose();
  }, [doc]);

  // Push pref changes (esp. wpm/chunk/mode/anchor) into the live engine.
  useEffect(() => {
    engineRef.current?.setPrefs(prefs);
  }, [prefs]);

  const controls = useMemo(
    () => ({
      play: () => engineRef.current?.play(),
      pause: () => engineRef.current?.pause(),
      toggle: () => engineRef.current?.toggle(),
      seek: (id: number) => engineRef.current?.seek(id),
      skip: (n: number) => engineRef.current?.skip(n),
      setWpm: (n: number) => engineRef.current?.setWpm(n),
    }),
    [],
  );

  const onSpaceToggle = useCallback(() => engineRef.current?.toggle(), []);

  return { snapshot, controls, onSpaceToggle };
}