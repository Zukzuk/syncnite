import * as React from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type UseParams = {
  headerH: number;
  onUserScroll?: () => void; // 👈 new: notify parent when user scrolls
};

type UseReturn = {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  scrollerElRef: React.RefObject<HTMLDivElement | null>;
  setScrollerEl: (ref: HTMLElement | Window | null) => void;
  scrollRowIntoView: (index: number, grouped: boolean) => void;
  scrollToScrollTop: (top: number) => void; // 👈 new: restore raw scrollTop
};

// A hook to manage scrolling to list items within a virtuoso scroller.
export function useListJumpToScroll({ headerH, onUserScroll }: UseParams): UseReturn {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const scrollerElRef = React.useRef<HTMLDivElement | null>(null);

  // track programmatic vs user-driven scroll
  const programmaticRef = React.useRef(false);
  const timeoutRef = React.useRef<number | null>(null);

  const startProgrammatic = React.useCallback(() => {
    programmaticRef.current = true;
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
    }
    // small window in which scroll events are considered programmatic
    timeoutRef.current = window.setTimeout(() => {
      programmaticRef.current = false;
      timeoutRef.current = null;
    }, 250);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setScrollerEl = React.useCallback(
    (ref: HTMLElement | Window | null) => {
      const el =
        typeof window !== "undefined" && ref instanceof window.HTMLElement
          ? (ref as HTMLDivElement)
          : null;

      // detach previous listener
      if (scrollerElRef.current) {
        scrollerElRef.current.onscroll = null;
      }

      scrollerElRef.current = el;

      if (el && onUserScroll) {
        el.onscroll = () => {
          if (programmaticRef.current) return;
          onUserScroll();
        };
      }
    },
    [onUserScroll]
  );

  const scrollRowIntoView = React.useCallback(
    (index: number, grouped: boolean) => {
      startProgrammatic();
      virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "auto" });

      // flat list: compensate for header height
      if (!grouped && headerH && scrollerElRef.current) {
        requestAnimationFrame(() => {
          try {
            scrollerElRef.current!.scrollTop -= headerH;
          } catch {
            /* no-op */
          }
        });
      }
    },
    [headerH, startProgrammatic]
  );

  const scrollToScrollTop = React.useCallback(
    (top: number) => {
      if (!scrollerElRef.current) return;
      startProgrammatic();
      try {
        scrollerElRef.current.scrollTo({ top, behavior: "auto" });
      } catch {
        /* no-op */
      }
    },
    [startProgrammatic]
  );

  return { virtuosoRef, scrollerElRef, setScrollerEl, scrollRowIntoView, scrollToScrollTop };
}
