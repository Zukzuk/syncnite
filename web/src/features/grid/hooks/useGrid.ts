import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UIControls, UIDerivedData, GameItem, ItemPositions, NavMode } from "../../../types/types";
import { useGridLayout } from "./useGridLayout";
import { useGridVirtualWindow } from "./useGridVirtualWindow";
import { useGridOpenItemToggle } from "./useGridOpenItemToggle";
import { useGridScrollJump } from "./useGridScrollJump";
import { useGridScrollRestore } from "./useGridScrollRestore";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    controlsH: number;
    sortH: number;
    ui: UIControls;
    derived: UIDerivedData;
};

type UseReturn = {
    containerHeight: number;
    positions: { left: number; top: number }[];
    visibleRange: { startIndex: number; endIndex: number };
    openWidth: string;
    openHeight: string;
    openIds: Set<string>;
    scrollItemIntoView: (index: number) => void;
    onToggleItemWithNav: (id: string, mode: NavMode) => void;
};

// Main grid hook
export function useGrid({
    gridRef,
    controlsH,
    sortH,
    ui,
    derived,
}: UseParams): UseReturn {
    const itemsLen = derived.itemsSorted.length;
    const isListView = ui.isListView;
    const { hasMenu, grid } = useInterLinkedTheme();
    const { id: routeId } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    // Base grid sizing (cols + viewport height)
    const { cols, viewportH } = useGridLayout({ gridRef, itemsLen });
    const viewCols = isListView ? 1 : Math.max(1, cols || 1);

    // Combined header/controls offset
    const topOffset = controlsH + sortH;
    // Open card CSS + numeric height
    const openWidth = `calc(100vw - ${hasMenu ? grid.navBarWidth : 0}px - ${grid.scrollbarWidth}px)`;
    const openHeight = `calc(100vh - ${topOffset}px)`;

    // Open/close state
    const { openIds, toggleOpen, replaceOpen } = useGridOpenItemToggle({
        allowMultipleOpen: false,
    });

    // Build id -> index map once per items change
    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        derived.itemsSorted.forEach((item: GameItem, index: number) => {
            map.set(item.id, index);
        });
        return map;
    }, [derived.itemsSorted]);

    // Build grid rows with open items occupying dedicated full-width rows
    const { rowItems, rowIsOpen } = useMemo(() => {
        const itemsLen = derived.itemsSorted.length;
        const rows: number[][] = [];
        const rowIsOpen: boolean[] = [];

        let currentRow: number[] = [];

        for (let i = 0; i < itemsLen; i++) {
            const item = derived.itemsSorted[i];
            if (!item) continue;
            const isOpen = openIds.has(item.id);

            if (isOpen) {
                // flush partial row before inserting dedicated open row
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    rowIsOpen.push(false);
                    currentRow = [];
                }
                rows.push([i]);
                rowIsOpen.push(true);
            } else {
                currentRow.push(i);
                if (currentRow.length === viewCols) {
                    rows.push(currentRow);
                    rowIsOpen.push(false);
                    currentRow = [];
                }
            }
        }

        // flush trailing partial row (closed)
        if (currentRow.length > 0) {
            rows.push(currentRow);
            rowIsOpen.push(false);
        }

        return { rowItems: rows, rowIsOpen };
    }, [derived.itemsSorted, openIds, viewCols]);

    // Compute row layout
    const {
        rowTops,
        rowHeights,
        containerHeight,
        itemRowIndex,
        itemColIndex,
    } = useMemo(() => {
        const rowCount = rowItems.length;
        const rowTops = new Array<number>(rowCount);
        const rowHeights = new Array<number>(rowCount);
        const itemRowIndex = new Array<number>(itemsLen);
        const itemColIndex = new Array<number>(itemsLen);

        const closedHeight = isListView ? grid.rowHeight : grid.cardHeight;
        let y = isListView ? 0 : grid.gap;

        for (let r = 0; r < rowCount; r++) {
            rowTops[r] = y;
            const openHeight = Math.max(closedHeight, viewportH);
            const height = rowIsOpen[r] ? openHeight : closedHeight;
            rowHeights[r] = height;

            const indices = rowItems[r];
            for (let c = 0; c < indices.length; c++) {
                const idx = indices[c];
                itemRowIndex[idx] = r;
                itemColIndex[idx] = c;
            }

            y += height + (isListView ? 0 : grid.gap);
        }

        const containerHeight =
            rowCount === 0
                ? grid.gap * 2 + closedHeight
                : y - (isListView ? 0 : grid.gap * 2);

        return {
            rowTops,
            rowHeights,
            containerHeight,
            itemRowIndex,
            itemColIndex,
        };
    }, [rowItems, rowIsOpen, itemsLen, viewportH, isListView]);

    // Per-row first/last item indices
    const rowFirstItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[0] : 0)),
        [rowItems]
    );
    const rowLastItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[row.length - 1] + 1 : 0)),
        [rowItems]
    );

    // Compute absolute item positions
    const positions = useMemo(() => {
        const out: ItemPositions = new Array(itemsLen);
        const strideX = grid.cardWidth + grid.gap;

        for (let i = 0; i < itemsLen; i++) {
            const r = itemRowIndex[i];
            if (r == null) continue;

            const c = itemColIndex[i] ?? 0;
            out[i] = {
                left: grid.gap + c * strideX,
                top: rowTops[r] ?? grid.gap,
            };
        }

        return out;
    }, [itemsLen, itemRowIndex, itemColIndex, rowTops]);

    // Virtual window (variable-height rows) + scroll position
    const { visibleRange, syncScrollTopNow } = useGridVirtualWindow({
        gridRef,
        opts: {
            rows: rowTops.length,
            cols: viewCols,
            itemsLen,
            rowTops,
            rowHeights,
            containerHeight,
            viewportH,
            rowFirstItemIndex,
            rowLastItemIndex,
        },
    });

    // Jump-to-scroll, based on positions
    const { scrollItemIntoView } = useGridScrollJump({
        gridRef,
        positions,
    });

    // Heights needed for restore logic
    const closedHeight = isListView ? grid.rowHeight : grid.cardHeight;
    const openRowHeight = Math.max(closedHeight, viewportH);

    // Open/close behavior with scroll restore according to the new rules
    const { syncOpenFromRoute } = useGridScrollRestore({
        gridRef,
        openIds,
        items: derived.itemsSorted as GameItem[],
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
    });

    // Handler to toggle open state via URL navigation
    const onToggleItemWithNav = useCallback(
        (id: string, navMode: NavMode) => {
            const willOpen = !openIds.has(id);

            if (willOpen) {
                // When URL is source of truth, switching/opening is done by route sync
                navigate(`/library/${id}`, { replace: navMode === "replace" });
            } else {
                navigate(`/library`, { replace: true });
            }
        },
        [openIds, navigate]
    );

    useEffect(() => {
        syncOpenFromRoute(routeId);
    }, [routeId, syncOpenFromRoute]);

    // // Open item must be "near" the top: from 100px above its top until its bottom
    // // passes the top of the viewport.
    // const hasOpenItemInView = useMemo(() => {
    //     if (isListView) return false;
    //     if (openIds.size === 0) return false;

    //     for (const openId of openIds) {
    //         const idx = idToIndex.get(openId);
    //         if (idx == null) continue;

    //         const rowIdx = itemRowIndex[idx];
    //         if (rowIdx == null) continue;

    //         const top = rowTops[rowIdx] ?? grid.gap;
    //         const height = rowHeights[rowIdx] ?? 0;
    //         const bottom = top + height;

    //         const activationStart = top - 100;
    //         const activationEnd = bottom;

    //         if (scrollTop >= activationStart && scrollTop <= activationEnd)
    //             return true;
    //     }

    //     return false;
    // }, [
    //     isListView,
    //     openIds,
    //     idToIndex,
    //     itemRowIndex,
    //     rowTops,
    //     rowHeights,
    //     scrollTop,
    // ]);

    // keep open item in view on layout changes
    const layoutRef = useRef({
        viewportH,
        containerHeight,
        itemsLen,
    });

    // Effect to keep open item in view on layout changes
    useEffect(() => {
        // Only if we actually have an open item
        if (openIds.size === 0) return;

        const openId = openIds.values().next().value as string | undefined;
        if (!openId) return;

        const idx = idToIndex.get(openId);
        if (idx == null) return;

        const prev = layoutRef.current;
        const next = { viewportH, containerHeight, itemsLen };

        const layoutChanged =
            !prev ||
            prev.viewportH !== next.viewportH ||
            prev.containerHeight !== next.containerHeight ||
            prev.itemsLen !== next.itemsLen;

        layoutRef.current = next;

        if (!layoutChanged) return;

        // Use the existing jump hook to keep the open item in view
        scrollItemIntoView(idx);
    }, [
        viewportH,
        containerHeight,
        itemsLen,
        openIds,
        idToIndex,
        scrollItemIntoView,
    ]);

    return {
        containerHeight,
        positions,
        visibleRange,
        openWidth,
        openHeight,
        openIds,
        scrollItemIntoView,
        onToggleItemWithNav,
    } as const;
}
