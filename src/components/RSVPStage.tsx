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

        {/* Three-segment word, anchor centred on focalX via absolute positioning. */}
        <div
          className="relative"
          style={{
            fontFamily: 'var(--rsvp-font)',
            fontSize: 'var(--rsvp-size)',
            lineHeight: 1.1,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            fontVariantLigatures: 'none',
            width: 0,
          }}
        >
          <span
            className="absolute"
            style={{
              right: '50%',
              top: 0,
              transform: 'translateX(-0.5ch)',
              whiteSpace: 'pre',
              textAlign: 'right',
            }}
          >
            {pre.replace(/ /g, '\u00A0')}
          </span>
          <span
            className="absolute"
            style={{
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              color: showAnchor ? 'var(--anchor)' : 'inherit',
              fontWeight: showAnchor ? anchorWeight : 'inherit',
              whiteSpace: 'pre',
              minWidth: '1ch',
              textAlign: 'center',
            }}
          >
            {anchorChar}
          </span>
          <span
            className="absolute"
            style={{
              left: '50%',
              top: 0,
              transform: 'translateX(0.5ch)',
              whiteSpace: 'pre',
              textAlign: 'left',
            }}
          >
            {post.replace(/ /g, '\u00A0')}
          </span>
        </div>
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