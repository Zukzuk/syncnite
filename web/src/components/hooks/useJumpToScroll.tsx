import * as React from "react";
import type { VirtuosoHandle } from "react-virtuoso";

export function useJumpToScroll(headerHeight: number | undefined) {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const scrollerElRef = React.useRef<HTMLDivElement | null>(null);

  const setScrollerEl = React.useCallback((ref: HTMLElement | Window | null) => {
    const el =
      typeof window !== "undefined" && ref instanceof window.HTMLElement
        ? (ref as HTMLDivElement)
        : null;
    scrollerElRef.current = el;
  }, []);

  const scrollRowIntoView = React.useCallback((index: number, grouped: boolean) => {
    virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" });
    if (!grouped && headerHeight && scrollerElRef.current) {
      requestAnimationFrame(() => {
        try {
          scrollerElRef.current!.scrollTop -= headerHeight;
        } catch {
          /* no-op */
        }
      });
    }
  }, [headerHeight]);

  return { virtuosoRef, scrollerElRef, setScrollerEl, scrollRowIntoView };
}
