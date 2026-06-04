import type { Mode } from './types';

export const WPM_MIN = 100;
export const WPM_MAX = 1200;

/** Derive the mode band from a WPM value.
 *  <350 comprehend, 350–599 accelerate, >=600 skim. */
export function wpmToMode(wpm: number): Mode {
  if (wpm < 350) return 'comprehend';
  if (wpm < 600) return 'accelerate';
  return 'skim';
}

/** Clamp any user input (incl. NaN / negative / over-max) into the WPM range. */
export function clampWpm(n: number): number {
  if (!Number.isFinite(n)) return WPM_MIN;
  return Math.max(WPM_MIN, Math.min(WPM_MAX, Math.round(n)));
}