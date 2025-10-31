import * as React from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type UseParams = {
  headerH: number;
};

type UseReturn = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerElRef: React.RefObject<HTMLDivElement | null>;
  setScrollerEl: (ref: HTMLElement | Window | null) => void;
  scrollRowIntoView: (index: number, grouped: boolean) => void;
};

/** Hook to manage scrolling to a specific row */
export function useListJumpToScroll({headerH}: UseParams): UseReturn {
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
    if (!grouped && headerH && scrollerElRef.current) {
      requestAnimationFrame(() => {
        try {
          scrollerElRef.current!.scrollTop -= headerH;
        } catch {
          /* no-op */
        }
      });
    }
  }, [headerH]);

  return { virtuosoRef, scrollerElRef, setScrollerEl, scrollRowIntoView };
}
