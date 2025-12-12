import { useCallback, useEffect, useRef, useState } from "react";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";

type UseParams = {
  gridRef: React.RefObject<HTMLDivElement | null>;
  openIds: Set<string>;
  items: GameItem[];
  idToIndex: Map<string, number>;
  viewportH: number;
  closedHeight: number;
  openRowHeight: number;
  itemRowIndex: number[];
  rowTops: number[];
  isListView: boolean;
  scrollItemIntoView: (index: number) => void;
  toggleOpen: (id: string) => void;
  replaceOpen: (nextId: string) => string | null;
};

type UseReturn = {
  onToggleItem: (id: string) => void;
};

// Hook to manage scroll position restoration when opening/closing items in the grid
export function useGridScrollRestore({
  gridRef,
  openIds,
  items,
  idToIndex,
  viewportH,
  closedHeight,
  openRowHeight,
  itemRowIndex,
  rowTops,
  isListView,
  scrollItemIntoView,
  toggleOpen,
  replaceOpen,
}: UseParams): UseReturn {
  const preOpenScrollTopRef = useRef<number | null>(null);
  const openItemIdRef = useRef<string | null>(null);
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);

  const lockAfterOpenRef = useRef(false);

  const onToggleItem = useCallback(
    (id: string) => {
      const el = gridRef.current;
      if (!el) return;

      const absoluteIndex = idToIndex.get(id);
      if (absoluteIndex == null) return;

      const willOpen = !openIds.has(id);

      // SWITCH: opening a different id while one is already open
      if (willOpen && openIds.size > 0) {
        const prevOpenId = openIds.values().next().value as string | undefined;

        if (prevOpenId && prevOpenId !== id) {
          // We want B's lock to be "post-jump", so set it later in the effect.
          preOpenScrollTopRef.current = null;
          openItemIdRef.current = id;
          lockAfterOpenRef.current = true;

          replaceOpen(id);
          setPendingScrollIndex(absoluteIndex);
          return;
        }
      }

      // OPEN / CLOSE
      if (willOpen) {
        preOpenScrollTopRef.current = el.scrollTop;
        openItemIdRef.current = id;

        lockAfterOpenRef.current = false;
        toggleOpen(id);
        setPendingScrollIndex(absoluteIndex);
      } else {
        const lock = preOpenScrollTopRef.current;
        const rowIdx = itemRowIndex[absoluteIndex];

        openItemIdRef.current = null;
        preOpenScrollTopRef.current = null;
        lockAfterOpenRef.current = false;

        if (rowIdx == null) {
          toggleOpen(id);
          return;
        }

        const rowTop = rowTops[rowIdx] ?? 0;
        const rowBottom = rowTop + openRowHeight;

        const viewTop = el.scrollTop;
        const viewBottom = viewTop + viewportH;

        toggleOpen(id);

        if (lock == null) return;

        if (rowTop < viewTop) {
          if (isListView) {
            el.scrollTop = rowTop;
          } else {
            const prevRowIdx = Math.max(0, rowIdx - 1);
            const prevRowTop = rowTops[prevRowIdx] ?? rowTop;
            el.scrollTop = prevRowTop - GRID.gap;
          }
        } else if (rowBottom > viewBottom) {
          el.scrollTop = viewTop;
        } else {
          el.scrollTop = lock;
        }
      }
    },
    [
      gridRef,
      openIds,
      idToIndex,
      viewportH,
      closedHeight,
      openRowHeight,
      itemRowIndex,
      rowTops,
      isListView,
      replaceOpen,
      toggleOpen,
    ]
  );

  // Perform scroll after layout updated for the opened item
  useEffect(() => {
    if (pendingScrollIndex == null) return;

    const el = gridRef.current;
    const idx = pendingScrollIndex;
    const item = items[idx];

    if (!el || !item || !openIds.has(item.id)) {
      setPendingScrollIndex(null);
      lockAfterOpenRef.current = false;
      return;
    }

    scrollItemIntoView(idx);

    // capture lock AFTER the jump
    if (lockAfterOpenRef.current) {
      if (isListView) {
        preOpenScrollTopRef.current = el.scrollTop;
      } else {
        // IMPORTANT: lock should compensate for the height that will be removed on close,
        // not for "card height" (collapse amount is openRowHeight - closedHeight)
        const delta = openRowHeight - closedHeight;
        preOpenScrollTopRef.current = Math.max(0, el.scrollTop - delta - GRID.gap);
      }

      lockAfterOpenRef.current = false;
    }

    setPendingScrollIndex(null);
  }, [pendingScrollIndex, items, openIds, scrollItemIntoView, gridRef, isListView, openRowHeight, closedHeight]);

  return { onToggleItem };
}
