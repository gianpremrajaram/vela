import { useLayoutEffect, useRef, useState } from 'react';
import type { Token } from '@/core/types';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { chunkAnchor } from '@/core/chunkAnchor';

interface Props {
  chunk: ReadonlyArray<Token>;
  progress: number; // 0..1
  totalTokens: number;
  currentIndex: number;
  onSeekFraction(f: number): void;
}

// Fixed focus-box widths per chunk size. The box is a guide, not a clip —
// long chunks may slightly exceed it.
const FOCUS_BOX_WIDTH: Record<1 | 2 | 3, string> = {
  1: '14ch',
  2: '22ch',
  3: '30ch',
};

export function RSVPStage({ chunk, progress, totalTokens, currentIndex, onSeekFraction }: Props) {
  const { prefs } = usePreferences();
  const size = (prefs.reading.chunkSize ?? 1) as 1 | 2 | 3;
  const { display, anchorIndex } = chunkAnchor(chunk, size);

  const pre = display.slice(0, anchorIndex);
  const anchorChar = display.slice(anchorIndex, anchorIndex + 1) || '\u00A0';
  const post = display.slice(anchorIndex + 1);

  const showAnchor = prefs.anchor.enabled;
  const anchorWeight = prefs.anchor.weight === 'bold' ? 700 : 400;
  const boxWidth = FOCUS_BOX_WIDTH[size];

  // Measure the anchor glyph's actual centre relative to the inline word
  // and offset the whole word so the anchor sits exactly on focalX. This
  // avoids the half-`ch` slot trick (which left a visible gap because most
  // glyphs are narrower than 1ch).
  const wordRef = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const w = wordRef.current;
    const a = anchorRef.current;
    if (!w || !a) return;
    const wb = w.getBoundingClientRect();
    const ab = a.getBoundingClientRect();
    const anchorCentre = ab.left + ab.width / 2 - wb.left;
    setOffset(wb.width / 2 - anchorCentre);
  }, [display, anchorIndex, prefs.typography.rsvp.family, prefs.typography.rsvp.size]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center select-none">
      <div
        className="relative flex items-center justify-center"
        style={{
          width: '100%',
          minHeight: 'calc(var(--rsvp-size) * 1.6)',
        }}
      >
        {/* Fixed focus box, centred on focalX (stage centre). */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border"
          style={{
            width: boxWidth,
            height: 'calc(var(--rsvp-size) * 1.45)',
            borderColor: 'var(--focus-box)',
          }}
        />

        {/* Optional focus guide: two short ticks above and below focalX. */}
        {prefs.anchor.focusGuide && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ height: 'calc(var(--rsvp-size) * 1.75)', width: 1 }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0"
              style={{ width: 1, height: 'calc(var(--rsvp-size) * 0.18)', background: 'var(--focus-guide)' }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-0"
              style={{ width: 1, height: 'calc(var(--rsvp-size) * 0.18)', background: 'var(--focus-guide)' }}
            />
          </div>
        )}

        {/* Single inline word; anchor glyph is measured and the whole word
            is shifted so that glyph's centre lands on focalX. No padding or
            half-ch tricks — glyphs are typeset flush against each other. */}
        <span
          ref={wordRef}
          className="relative inline-block"
          style={{
            fontFamily: 'var(--rsvp-font)',
            fontSize: 'var(--rsvp-size)',
            lineHeight: 1.1,
            color: 'var(--text)',
            whiteSpace: 'pre',
            fontVariantLigatures: 'none',
            transform: `translateX(${offset}px)`,
            willChange: 'transform',
          }}
        >
          {pre.replace(/ /g, '\u00A0')}
          <span
            ref={anchorRef}
            style={{
              color: showAnchor ? 'var(--anchor)' : 'inherit',
              fontWeight: showAnchor ? anchorWeight : 'inherit',
            }}
          >
            {anchorChar}
          </span>
          {post.replace(/ /g, '\u00A0')}
        </span>
      </div>

      {prefs.appearance.showProgressBar && (
        <ProgressBar
          progress={progress}
          currentIndex={currentIndex}
          totalTokens={totalTokens}
          onSeekFraction={onSeekFraction}
        />
      )}
    </div>
  );
}

function ProgressBar({
  progress,
  onSeekFraction,
  currentIndex,
  totalTokens,
}: {
  progress: number;
  onSeekFraction(f: number): void;
  currentIndex: number;
  totalTokens: number;
}) {
  return (
    <div className="w-full max-w-xl mt-12 px-6 opacity-40 transition-opacity hover:opacity-90 focus-within:opacity-90">
      <div
        role="slider"
        aria-label="Reading position"
        aria-valuemin={0}
        aria-valuemax={totalTokens}
        aria-valuenow={currentIndex}
        tabIndex={0}
        className="relative h-0.5 w-full cursor-pointer rounded-full bg-[var(--line)]"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeekFraction((e.clientX - rect.left) / rect.width);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--muted-fg)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2 text-center text-[10px] text-[var(--muted-fg)] tabular-nums">
        {currentIndex} / {totalTokens}
      </div>
    </div>
  );
}