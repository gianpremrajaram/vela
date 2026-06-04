import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_MS = 600;

export function useViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isFollowingLive, setIsFollowingLive] = useState(true);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setIsUserScrolling(true);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setIsUserScrolling(false), IDLE_MS);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  const scrollToTokenEl = useCallback((tokenId: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-token-id="${tokenId}"]`);
    if (!target) return;
    const containerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top - containerRect.height / 3;
    el.scrollTo({ top: el.scrollTop + offset, behavior: smooth ? 'smooth' : 'auto' });
    setIsFollowingLive(true);
  }, []);

  // Detect if read-head is visible to flag follow-live status.
  const updateLiveFlag = useCallback((tokenId: number) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-token-id="${tokenId}"]`);
    if (!target) {
      setIsFollowingLive(false);
      return;
    }
    const c = el.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const visible = t.top >= c.top && t.bottom <= c.bottom;
    setIsFollowingLive(visible);
  }, []);

  return { containerRef, isUserScrolling, isFollowingLive, scrollToTokenEl, updateLiveFlag };
}