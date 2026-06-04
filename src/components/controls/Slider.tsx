import { cn } from '@/lib/utils';

interface Props {
  value: number;
  onChange(next: number): void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  className?: string;
}

export function Slider({ value, onChange, min, max, step = 1, label, className }: Props) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'w-full accent-[var(--accent)] cursor-pointer',
        className,
      )}
    />
  );
}