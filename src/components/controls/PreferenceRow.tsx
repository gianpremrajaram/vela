import type { ReactNode } from 'react';

interface Props {
  label: string;
  description?: string;
  children: ReactNode;
}

export function PreferenceRow({ label, description, children }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--text)]">{label}</div>
        {description && (
          <div className="text-xs text-[var(--muted-fg)] mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}