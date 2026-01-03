import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { InterLinkedItem, InterLinkedGrid } from "../../../types/interlinked";

type UseParams = {
  gridRef: RefObject<HTMLDivElement | null>;
  openIds: Set<string>;
  itemsSorted: InterLinkedItem[];
  grid: InterLinkedGrid;
  idToIndex: Map<string, number>;
  viewportH: number;
  closedHeight: number;
  openRowHeight: number;
  itemRowIndex: number[];
  rowTops: number[];
  isListView: boolean;
  scrollItemIntoView: (index: number) => void;
  syncScrollTopNow: () => void;
  toggleOpen: (id: string) => void;
  replaceOpen: (nextId: string) => string | null;
};

type UseReturn = {
  syncOpenFromRoute: (id?: string) => void;
};

// Hook to manage scroll position restoration when opening/closing items in the grid
export function useGridScrollRestore({
  gridRef,
  openIds,
  itemsSorted,
  grid,
  idToIndex,
  viewportH,
  closedHeight,
  openRowHeight,
  itemRowIndex,
  rowTops,
  isListView,
  scrollItemIntoView,
  syncScrollTopNow,
  toggleOpen,
  replaceOpen,
}: UseParams): UseReturn {
  const preOpenScrollTopRef = useRef<number | null>(null);
  const openItemIdRef = useRef<string | null>(null);
  const lockAfterOpenRef = useRef(false);

  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
    null
  );

  const closeId = useCallback(
    (id: string) => {
      const el = gridRef.current;
      if (!el) return;

      const absoluteIndex = idToIndex.get(id);
      if (absoluteIndex == null) return;

      const lock = preOpenScrollTopRef.current;
      const rowIdx = itemRowIndex[absoluteIndex];

      // clear refs
      openItemIdRef.current = null;
      preOpenScrollTopRef.current = null;
      lockAfterOpenRef.current = false;

      // close
      toggleOpen(id);

      if (rowIdx == null) return;
      if (lock == null) return;

      const rowTop = rowTops[rowIdx] ?? 0;
      const rowBottom = rowTop + openRowHeight;

      const viewTop = el.scrollTop;
      const viewBottom = viewTop + viewportH;

      if (rowTop < viewTop) {
        if (isListView) {
          el.scrollTop = rowTop;
        } else {
          const prevRowIdx = Math.max(0, rowIdx - 1);
          const prevRowTop = rowTops[prevRowIdx] ?? rowTop;
          el.scrollTop = prevRowTop - grid.gap;
        }
      } else if (rowBottom > viewBottom) {
        el.scrollTop = viewTop;
      } else {
        el.scrollTop = lock;
      }
    },
    [
      grid.gap,
      gridRef,
      idToIndex,
      itemRowIndex,
      rowTops,
      openRowHeight,
      viewportH,
      isListView,
      toggleOpen,
    ]
  );

  const openId = useCallback(
    (id: string) => {
      const el = gridRef.current;
      if (!el) return;

      const absoluteIndex = idToIndex.get(id);
      if (absoluteIndex == null) return;

      preOpenScrollTopRef.current = el.scrollTop;
      openItemIdRef.current = id;
      lockAfterOpenRef.current = false;

      toggleOpen(id);
      setPendingScrollIndex(absoluteIndex);
    },
    [gridRef, idToIndex, toggleOpen]
  );

  const replaceWithId = useCallback(
    (id: string) => {
      const absoluteIndex = idToIndex.get(id);
      if (absoluteIndex == null) return;

      // We want lock to be captured AFTER the jump in the effect.
      preOpenScrollTopRef.current = null;
      openItemIdRef.current = id;
      lockAfterOpenRef.current = true;

      replaceOpen(id);
      setPendingScrollIndex(absoluteIndex);
    },
    [idToIndex, replaceOpen]
  );

  const syncOpenFromRoute = useCallback(
    (routeId?: string) => {
      const currentOpen = openIds.values().next().value as string | undefined;

      // route says "close"
      if (!routeId) {
        if (!currentOpen) return;
        closeId(currentOpen);
        return;
      }

      // route says "open this"
      if (currentOpen === routeId) return;

      if (!currentOpen) {
        openId(routeId);
        return;
      }

      // switching
      replaceWithId(routeId);
    },
    [openIds, closeId, openId, replaceWithId]
  );

  // Perform scroll after layout updated for the opened item
  useEffect(() => {
    if (pendingScrollIndex == null) return;

    const el = gridRef.current;
    const idx = pendingScrollIndex;
    const item = itemsSorted[idx];

    if (!el || !item || !openIds.has(item.id)) {
      setPendingScrollIndex(null);
      lockAfterOpenRef.current = false;
      return;
    }

    scrollItemIntoView(idx);
    syncScrollTopNow();
    
    // capture lock AFTER the jump (used for close restore)
    if (lockAfterOpenRef.current) {
      if (isListView) {
        preOpenScrollTopRef.current = el.scrollTop;
      } else {
        // IMPORTANT: lock should compensate for the height that will be removed on close
        const delta = openRowHeight - closedHeight;
        preOpenScrollTopRef.current = Math.max(
          0,
          el.scrollTop - delta - grid.gap
        );
      }

      lockAfterOpenRef.current = false;
    }

    setPendingScrollIndex(null);
  }, [
    pendingScrollIndex,
    itemsSorted,
    openIds,
    gridRef,
    isListView,
    openRowHeight,
    closedHeight,
    grid.gap,
    scrollItemIntoView,
  ]);

  return { syncOpenFromRoute };
}
