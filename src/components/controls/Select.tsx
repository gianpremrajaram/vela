import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange(next: T): void;
  label?: string;
  className?: string;
}

export function Select<T extends string>({ value, options, onChange, label, className }: Props<T>) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}