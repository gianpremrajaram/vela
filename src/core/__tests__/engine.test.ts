import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../engine';
import { tokenisePlainText } from '../tokeniser';
import type { Preferences } from '../types';

function makePrefs(over: Partial<Preferences['reading']> = {}): Preferences {
  return {
    reading: {
      mode: 'comprehend',
      wpm: 300, // 200ms/token base
      chunkSize: 1,
      punctuationPauses: false,
      punctuationIntensity: 'standard',
      extraDwellLongWords: false,
      extraDwellNumerals: false,
      academicCapWarning: true,
      ...over,
    },
    anchor: { enabled: true, colour: '#0aa', weight: 'bold' },
    typography: {
      rsvp: { family: 'sans', size: 'L' },
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
      theme: 'light',
      accent: '#0aa',
      splitRatio: 0.67,
      showProgressBar: true,
      reducedMotion: false,
    },
  };
}

/** Manual clock + scheduler so we control the rAF loop. */
function makeClock() {
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  const schedule = (cb: (t: number) => void) => {
    pending = cb;
    return () => {
      if (pending === cb) pending = null;
    };
  };
  return {
    now: () => now,
    schedule,
    tick(ms: number) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.(now);
    },
    pending: () => pending !== null,
  };
}

describe('engine', () => {
  it('advances one token per dwell window', () => {
    const doc = tokenisePlainText('one two three four five six');
    const clock = makeClock();
    const onTick = vi.fn();
    const engine = createEngine({
      doc,
      prefs: makePrefs(),
      onTick,
      now: clock.now,
      schedule: clock.schedule,
    });
    engine.play();
    expect(engine.getSnapshot().state.index).toBe(0);
    clock.tick(200);
    expect(engine.getSnapshot().state.index).toBe(1);
    clock.tick(200);
    expect(engine.getSnapshot().state.index).toBe(2);
    engine.dispose();
  });

  it('pause stops advancement', () => {
    const doc = tokenisePlainText('one two three four');
    const clock = makeClock();
    const engine = createEngine({
      doc,
      prefs: makePrefs(),
      onTick: () => {},
      now: clock.now,
      schedule: clock.schedule,
    });
    engine.play();
    clock.tick(200);
    engine.pause();
    const before = engine.getSnapshot().state.index;
    clock.tick(1000);
    expect(engine.getSnapshot().state.index).toBe(before);
  });

  it('seek jumps and skip is relative', () => {
    const doc = tokenisePlainText('one two three four five six seven');
    const engine = createEngine({
      doc,
      prefs: makePrefs(),
      onTick: () => {},
      now: () => 0,
      schedule: () => () => {},
    });
    engine.seek(3);
    expect(engine.getSnapshot().state.index).toBe(3);
    engine.skip(-2);
    expect(engine.getSnapshot().state.index).toBe(1);
    engine.skip(100);
    expect(engine.getSnapshot().state.index).toBe(doc.tokens.length);
  });

  it('setWpm changes cadence on next tick', () => {
    const doc = tokenisePlainText('a b c d e f g h');
    const clock = makeClock();
    const engine = createEngine({
      doc,
      prefs: makePrefs(),
      onTick: () => {},
      now: clock.now,
      schedule: clock.schedule,
    });
    engine.play();
    clock.tick(200);
    expect(engine.getSnapshot().state.index).toBe(1);
    engine.setWpm(600); // 100ms/token
    clock.tick(100);
    expect(engine.getSnapshot().state.index).toBe(2);
  });
});