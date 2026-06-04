import { useCallback, useEffect, useRef, type ReactNode } from 'react';

interface Props {
  ratio: number; // left fraction 0..1
  onRatioChange(next: number): void;
  left: ReactNode;
  right: ReactNode;
  min?: number;
  max?: number;
}

export function SplitPane({ ratio, onRatioChange, left, right, min = 0.3, max = 0.85 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = (e.clientX - rect.left) / rect.width;
      onRatioChange(Math.max(min, Math.min(max, next)));
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [min, max, onRatioChange]);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div style={{ flexBasis: `${ratio * 100}%` }} className="min-w-0 h-full">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onPointerDown}
        className="w-1 cursor-col-resize bg-[var(--line)] hover:bg-[var(--accent)]/40 transition-colors shrink-0"
      />
      <div style={{ flexBasis: `${(1 - ratio) * 100}%` }} className="min-w-0 h-full">
        {right}
      </div>
    </div>
  );
}