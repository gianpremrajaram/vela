import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange(next: T): void;
  className?: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex rounded-md border border-[var(--line)] bg-[var(--surface)] p-0.5',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1 text-sm rounded transition-colors',
              active
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted-fg)] hover:text-[var(--text)]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}