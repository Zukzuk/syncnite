import React from "react";
import { useElementSize } from "@mantine/hooks";

// Minimal shapes the hook relies on (structural typing)
export type LibraryRow = {
  id: string;
  hidden: boolean;
  installed: boolean;
  iconUrl?: string | null;
  title: string;
  source: string;
  tags: string[];
  year?: number | null;
  url?: string | null;
};

export type WithBucket = { row: LibraryRow; bucket: string };

export type DerivedShape = {
  rowsSorted: LibraryRow[];
  withBuckets: WithBucket[];
};

export type UIShape = {
  sortKey: string;
  sortDir: string;
  showHidden: boolean;
  q?: string;
  source?: string | null;
  tag?: string | null;
  installedOnly?: boolean;
};

export type FlatNode =
  | { kind: "separator"; key: string; bucket: string }
  | { kind: "row"; key: string; row: LibraryRow };

export function useInfiniteLibrary({
  ui,
  derived,
  rowPx = 56,
  threshold = 400,
}: {
  ui: UIShape;
  derived: DerivedShape;
  rowPx?: number;
  threshold?: number;
}) {
  // Measure the scroll container to size batches from viewport height
  const scrollSize = useElementSize();

  // Manage and forward the scroll container ref to Mantine's measurement ref
  const scrollElRef = React.useRef<HTMLDivElement | null>(null);
  const setScrollRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      scrollElRef.current = el;
      // forward element to Mantine's ref (handles both callback and ref object)
      const r = scrollSize.ref as unknown;
      if (typeof r === "function") {
        (r as (node: HTMLDivElement | null) => void)(el);
      } else if (r && typeof (r as any) === "object") {
        (r as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [scrollSize.ref]
  );

  // Flatten rows (and insert A–Z separators when sorting by title)
  const flat: FlatNode[] = React.useMemo(() => {
    if (ui.sortKey === "title") {
      const out: FlatNode[] = [];
      let prev: string | null = null;
      for (const { row, bucket } of derived.withBuckets) {
        if (bucket !== prev) {
          prev = bucket;
          out.push({ kind: "separator", key: `sep-${bucket}-${out.length}`, bucket });
        }
        out.push({ kind: "row", key: row.id, row });
      }
      return out;
    }
    return derived.rowsSorted.map((row) => ({ kind: "row", key: row.id, row }));
  }, [ui.sortKey, derived.withBuckets, derived.rowsSorted]);

  // Infinite list window size
  const [visibleCount, setVisibleCount] = React.useState(0);

  const perViewport = Math.max(1, Math.ceil((scrollSize.height || 600) / rowPx));
  const initialCount = perViewport * 5 + 20; // generous first paint
  const batchSize = perViewport * 4; // load more per near-bottom

  // Reset window when filters/sorts change or container size changes
  React.useEffect(() => {
    setVisibleCount(initialCount);
  }, [
    initialCount,
    ui.q,
    ui.source,
    ui.tag,
    ui.showHidden,
    ui.installedOnly,
    ui.sortKey,
    ui.sortDir,
    flat.length,
  ]);

  const onScroll = React.useCallback(() => {
    const el = scrollElRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      setVisibleCount((v) => Math.min(v + batchSize, flat.length));
    }
  }, [batchSize, flat.length, threshold]);

  const visibleNodes = React.useMemo(() => flat.slice(0, visibleCount), [flat, visibleCount]);
  const hasMore = visibleCount < flat.length;

  return {
    setScrollRef,
    onScroll,
    visibleNodes,
    hasMore,
  };
}
