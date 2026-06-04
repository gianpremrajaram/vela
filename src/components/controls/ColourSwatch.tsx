import { cn } from '@/lib/utils';

interface Props {
  value: string;
  presets: ReadonlyArray<string>;
  onChange(next: string): void;
}

export function ColourSwatch({ value, presets, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            'h-6 w-6 rounded-full border border-[var(--line)] transition-transform',
            value === c && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)] scale-110',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="ml-1 inline-flex items-center gap-1 text-xs text-[var(--muted-fg)]">
        custom
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-[var(--line)] bg-transparent"
        />
      </label>
    </div>
  );
}