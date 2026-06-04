import type { DocumentModel, Mode, Preferences, ReaderState } from './types';
import { MODE_RANGES } from './types';
import { advance, chunkAt } from './advance';

export type Scheduler = (cb: (now: number) => void) => () => void;
export type Now = () => number;

export interface EngineDeps {
  doc: DocumentModel;
  prefs: Preferences;
  onTick: (snapshot: EngineSnapshot) => void;
  now?: Now;
  schedule?: Scheduler; // returns cancel fn
}

export interface EngineSnapshot {
  state: ReaderState;
  currentChunk: ReadonlyArray<import('./types').Token>;
  currentDwell: number;
  progress: number; // 0..1
}

export interface Engine {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(tokenId: number): void;
  skip(delta: number): void;
  setWpm(wpm: number): void;
  setMode(mode: Mode): void;
  setPrefs(prefs: Preferences): void;
  setDoc(doc: DocumentModel): void;
  getSnapshot(): EngineSnapshot;
  dispose(): void;
}

const defaultNow: Now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const defaultSchedule: Scheduler = (cb) => {
  if (typeof requestAnimationFrame === 'undefined') {
    const id = setTimeout(() => cb(defaultNow()), 16);
    return () => clearTimeout(id);
  }
  const id = requestAnimationFrame(cb);
  return () => cancelAnimationFrame(id);
};

export function createEngine(deps: EngineDeps): Engine {
  const now: Now = deps.now ?? defaultNow;
  const schedule: Scheduler = deps.schedule ?? defaultSchedule;

  let doc = deps.doc;
  let prefs = deps.prefs;
  let state: ReaderState = { index: 0, isPlaying: false, wpm: prefs.reading.wpm };
  let accumulator = 0;
  let lastTick = now();
  let cancel: (() => void) | null = null;

  const buildSnapshot = (): EngineSnapshot => {
    const chunk = chunkAt(doc, state.index, prefs.reading.chunkSize);
    const total = Math.max(1, doc.tokens.length);
    return {
      state: { ...state },
      currentChunk: chunk,
      currentDwell: 0,
      progress: Math.min(1, state.index / total),
    };
  };

  const emit = (snap?: EngineSnapshot) => deps.onTick(snap ?? buildSnapshot());

  const loop = (t: number) => {
    cancel = null;
    if (!state.isPlaying) return;
    const elapsed = t - lastTick;
    lastTick = t;
    accumulator += elapsed;
    const result = advance(doc, state, prefs, accumulator);
    state = result.state;
    accumulator = result.accumulator;
    if (result.finished) {
      emit();
      return;
    }
    if (result.flashed) emit();
    cancel = schedule(loop);
  };

  const start = () => {
    if (cancel) return;
    lastTick = now();
    cancel = schedule(loop);
  };
  const stop = () => {
    if (cancel) {
      cancel();
      cancel = null;
    }
  };

  const api: Engine = {
    play() {
      if (state.index >= doc.tokens.length) state = { ...state, index: 0 };
      state = { ...state, isPlaying: true };
      accumulator = 0;
      emit();
      start();
    },
    pause() {
      state = { ...state, isPlaying: false };
      stop();
      emit();
    },
    toggle() {
      if (state.isPlaying) api.pause();
      else api.play();
    },
    seek(tokenId) {
      state = { ...state, index: Math.max(0, Math.min(doc.tokens.length, tokenId)) };
      accumulator = 0;
      emit();
    },
    skip(delta) {
      api.seek(state.index + delta);
    },
    setWpm(wpm) {
      const clamped = Math.max(100, Math.min(1200, Math.round(wpm)));
      prefs = { ...prefs, reading: { ...prefs.reading, wpm: clamped } };
      state = { ...state, wpm: clamped };
      accumulator = 0;
      emit();
    },
    setMode(mode) {
      const r = MODE_RANGES[mode];
      prefs = {
        ...prefs,
        reading: { ...prefs.reading, mode, wpm: r.default },
      };
      state = { ...state, wpm: r.default };
      accumulator = 0;
      emit();
    },
    setPrefs(next) {
      const wpmChanged = next.reading.wpm !== prefs.reading.wpm;
      prefs = next;
      if (wpmChanged) state = { ...state, wpm: next.reading.wpm };
      accumulator = 0;
      emit();
    },
    setDoc(nextDoc) {
      doc = nextDoc;
      state = { index: 0, isPlaying: false, wpm: prefs.reading.wpm };
      accumulator = 0;
      stop();
      emit();
    },
    getSnapshot: buildSnapshot,
    dispose() {
      stop();
    },
  };

  return api;
}