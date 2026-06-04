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
  // runStart anchors the continuous read-run underline. Reset on any manual
  // jump (seek, click-word, chip-jump, new document); untouched during play.
  const [runStart, setRunStart] = useState(0);

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
    setRunStart(0);
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
      seek: (id: number) => {
        engineRef.current?.seek(id);
        setRunStart(Math.max(0, id));
      },
      skip: (n: number) => {
        const cur = engineRef.current?.getSnapshot().state.index ?? 0;
        const next = Math.max(0, cur + n);
        engineRef.current?.seek(next);
        setRunStart(next);
      },
      setWpm: (n: number) => engineRef.current?.setWpm(n),
    }),
    [],
  );

  const onSpaceToggle = useCallback(() => engineRef.current?.toggle(), []);

  return { snapshot, controls, onSpaceToggle, runStart };
}