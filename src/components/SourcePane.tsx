import { useEffect, useMemo, useRef } from 'react';
import type { DocumentModel } from '@/core/types';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { useViewport } from '@/lib/reader/useViewport';
import { cn } from '@/lib/utils';

interface Props {
  doc: DocumentModel;
  currentIndex: number;
  onSeek(tokenId: number): void;
}

export function SourcePane({ doc, currentIndex, onSeek }: Props) {
  const { prefs } = usePreferences();
  const { containerRef, isUserScrolling, isFollowingLive, scrollToTokenEl, updateLiveFlag } =
    useViewport();

  // Single delegated click handler for click-word-to-seek.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-token-id]') as HTMLElement | null;
      if (!target) return;
      const id = Number(target.dataset.tokenId);
      if (!Number.isNaN(id)) onSeek(id);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [onSeek, containerRef]);

  // Auto-scroll to follow read-head when toggle is on and user isn't scrolling.
  useEffect(() => {
    if (!prefs.source.autoScroll) return;
    if (isUserScrolling) return;
    scrollToTokenEl(currentIndex, !prefs.appearance.reducedMotion);
  }, [currentIndex, prefs.source.autoScroll, prefs.appearance.reducedMotion, isUserScrolling, scrollToTokenEl]);

  // Recompute follow-live flag whenever index changes.
  useEffect(() => {
    updateLiveFlag(currentIndex);
  }, [currentIndex, updateLiveFlag]);

  const sections = doc.sections;

  const underlineThicknessPx =
    prefs.source.underlineThickness === 'thin'
      ? '1px'
      : prefs.source.underlineThickness === 'thick'
        ? '3px'
        : '2px';

  // Group tokens by paragraph for sensible rendering breaks.
  const paragraphs = useMemo(() => {
    const groups: Array<{ paragraphId: number; sectionId: number; tokens: typeof doc.tokens }> = [];
    let current: { paragraphId: number; sectionId: number; tokens: typeof doc.tokens } | null = null;
    for (const t of doc.tokens) {
      if (!current || current.paragraphId !== t.paragraphId) {
        current = { paragraphId: t.paragraphId, sectionId: t.sectionId, tokens: [] };
        groups.push(current);
      }
      current.tokens.push(t);
    }
    return groups;
  }, [doc]);

  const sectionFirstParagraph = useMemo(() => {
    const seen = new Set<number>();
    const map = new Map<number, number>(); // paragraphId -> sectionId
    paragraphs.forEach((p) => {
      if (!seen.has(p.sectionId)) {
        seen.add(p.sectionId);
        map.set(p.paragraphId, p.sectionId);
      }
    });
    return map;
  }, [paragraphs]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface)]">
      {prefs.source.showSectionChips && sections.length > 1 && (
        <div className="shrink-0 border-b border-[var(--line)] px-6 py-3 overflow-x-auto">
          <div className="flex gap-2">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  scrollToTokenEl(s.firstTokenId, !prefs.appearance.reducedMotion);
                }}
                className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted-fg)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 overflow-y-auto px-10 py-10"
        style={{
          fontFamily: 'var(--doc-font)',
          fontSize: 'var(--doc-size)',
          lineHeight: 'var(--doc-line-height)',
          color: 'var(--text)',
        }}
      >
        <article className="mx-auto max-w-2xl">
          {paragraphs.map((p) => {
            const sectionHeader = sectionFirstParagraph.get(p.paragraphId);
            const section = sectionHeader !== undefined ? sections[sectionHeader] : null;
            return (
              <div key={p.paragraphId} className="mb-5">
                {section && (
                  <h2 className="mb-2 text-base font-semibold tracking-tight text-[var(--text)]">
                    {section.title}
                  </h2>
                )}
                <p>
                  {p.tokens.map((t, i) => {
                    const isCurrent = t.id === currentIndex;
                    const isRead = t.id < currentIndex;
                    const treatment =
                      isRead && prefs.source.readTreatment === 'fade'
                        ? 'opacity-50'
                        : isRead && prefs.source.readTreatment === 'dim'
                          ? 'opacity-70'
                          : '';
                    const indicator =
                      isCurrent && prefs.source.currentWordIndicator === 'highlight'
                        ? 'bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] rounded px-0.5'
                        : '';
                    return (
                      <span key={t.id}>
                        <span
                          data-token-id={t.id}
                          className={cn(
                            'cursor-pointer transition-colors',
                            treatment,
                            indicator,
                          )}
                          style={
                            isCurrent && prefs.source.currentWordIndicator === 'underline'
                              ? {
                                  textDecoration: 'underline',
                                  textDecorationColor: 'var(--underline-current)',
                                  textDecorationThickness: underlineThicknessPx,
                                  textUnderlineOffset: '3px',
                                }
                              : undefined
                          }
                        >
                          {t.raw}
                        </span>
                        {i < p.tokens.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })}
        </article>

        {!isFollowingLive && (
          <button
            type="button"
            onClick={() => scrollToTokenEl(currentIndex, !prefs.appearance.reducedMotion)}
            className="sticky bottom-4 ml-auto block rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white shadow-lg hover:opacity-90"
          >
            Return to live
          </button>
        )}
      </div>
    </div>
  );
}