import { describe, it, expect, beforeEach } from 'vitest';
import { defaultPreferences, loadPreferences, savePreferences } from '../../lib/preferences/storage';

describe('preferences storage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads defaults when nothing is stored', () => {
    expect(loadPreferences()).toEqual(defaultPreferences);
  });

  it('persists and restores a modified value', () => {
    const next = { ...defaultPreferences, reading: { ...defaultPreferences.reading, wpm: 555 } };
    savePreferences(next);
    expect(loadPreferences().reading.wpm).toBe(555);
  });

  it('falls back to defaults on malformed JSON', () => {
    localStorage.setItem('vela.preferences.v1', '{not json');
    expect(loadPreferences()).toEqual(defaultPreferences);
  });
});