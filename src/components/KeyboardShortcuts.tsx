import { useEffect } from 'react';

interface Props {
  onToggle(): void;
  onSkip(n: number): void;
  onWpmDelta(d: number): void;
  onPause(): void;
}

export function KeyboardShortcuts({ onToggle, onSkip, onWpmDelta, onPause }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onToggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSkip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSkip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          onWpmDelta(50);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onWpmDelta(-50);
          break;
        case 'Escape':
          onPause();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle, onSkip, onWpmDelta, onPause]);
  return null;
}