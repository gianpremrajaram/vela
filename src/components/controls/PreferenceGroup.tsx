import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export function PreferenceGroup({ title, children }: Props) {
  return (
    <section className="py-4 border-b border-[var(--line)] last:border-b-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)] mb-2">
        {title}
      </h3>
      <div className="divide-y divide-[var(--line)]">{children}</div>
    </section>
  );
}