import { useMemo } from 'react';
import type { Token } from '@/core/types';
import { usePreferences } from '@/lib/preferences/PreferencesContext';

interface Props {
  chunk: ReadonlyArray<Token>;
  progress: number; // 0..1
  totalTokens: number;
  currentIndex: number;
  onSeekFraction(f: number): void;
}

/**
 * Renders the displayed word(s) as three segments so the anchor character sits
 * at a fixed horizontal point across every word. We use CSS grid with a
 * centred "anchor" column; left and right columns have equal max width so the
 * anchor stays pinned.
 */
export function RSVPStage({ chunk, progress, totalTokens, currentIndex, onSeekFraction }: Props) {
  const { prefs } = usePreferences();
  const word = useMemo(() => chunk.map((t) => t.raw).join(' '), [chunk]);

  // Anchor on the longest token's anchor index, applied to the joined word's
  // first token visually. For multi-token chunks we render the joined string
  // with the anchor on the first token's anchorIndex (simple + readable).
  const first = chunk[0];
  const anchorPos = first ? first.anchorIndex : 0;
  const pre = first ? word.slice(0, anchorPos) : '';
  const anchorChar = first ? word.slice(anchorPos, anchorPos + 1) : '';
  const post = first ? word.slice(anchorPos + 1) : '';

  const showAnchor = prefs.anchor.enabled;
  const anchorWeight = prefs.anchor.weight === 'bold' ? 700 : 400;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none">
      <div
        className="grid items-baseline"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          fontFamily: 'var(--rsvp-font)',
          fontSize: 'var(--rsvp-size)',
          lineHeight: 1.1,
          color: 'var(--text)',
          minHeight: 'calc(var(--rsvp-size) * 1.4)',
        }}
      >
        <span className="text-right pr-px tabular-nums" style={{ fontVariantLigatures: 'none' }}>
          {pre || '\u00A0'}
        </span>
        <span
          style={{
            color: showAnchor ? 'var(--anchor)' : 'inherit',
            fontWeight: showAnchor ? anchorWeight : 'inherit',
          }}
        >
          {anchorChar || '\u00A0'}
        </span>
        <span className="text-left pl-px" style={{ fontVariantLigatures: 'none' }}>
          {post || '\u00A0'}
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
    <div className="w-full max-w-xl mt-12 px-6">
      <div
        role="slider"
        aria-label="Reading position"
        aria-valuemin={0}
        aria-valuemax={totalTokens}
        aria-valuenow={currentIndex}
        tabIndex={0}
        className="relative h-1 w-full cursor-pointer rounded-full bg-[var(--line)]"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeekFraction((e.clientX - rect.left) / rect.width);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2 text-center text-xs text-[var(--muted-fg)] tabular-nums">
        {currentIndex} / {totalTokens}
      </div>
    </div>
  );
}