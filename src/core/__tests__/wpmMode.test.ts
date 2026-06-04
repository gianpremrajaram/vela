import { describe, it, expect } from 'vitest';
import { clampWpm, wpmToMode } from '../wpmMode';

describe('wpmToMode bands', () => {
  it('comprehend below 350', () => {
    expect(wpmToMode(100)).toBe('comprehend');
    expect(wpmToMode(349)).toBe('comprehend');
  });
  it('accelerate 350..599', () => {
    expect(wpmToMode(350)).toBe('accelerate');
    expect(wpmToMode(599)).toBe('accelerate');
  });
  it('skim >= 600', () => {
    expect(wpmToMode(600)).toBe('skim');
    expect(wpmToMode(1200)).toBe('skim');
  });
});

describe('clampWpm', () => {
  it('clamps below min', () => expect(clampWpm(50)).toBe(100));
  it('clamps above max', () => expect(clampWpm(5000)).toBe(1200));
  it('rounds', () => expect(clampWpm(312.7)).toBe(313));
  it('NaN -> min', () => expect(clampWpm(NaN)).toBe(100));
  it('negative -> min', () => expect(clampWpm(-10)).toBe(100));
});