import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGridLayout } from "./useGridLayout";
import { useGridVirtualWindow } from "./useGridVirtualWindow";
import { useGridOpenItemToggle } from "./useGridOpenItemToggle";
import { useGridScrollJump } from "./useGridScrollJump";
import { useGridScrollRestore } from "./useGridScrollRestore";
import { DesktopMode, HistoryNavMode, ItemPositions, UIControls, UIDerivedData } from "../../../../../types/app";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    controlsH: number;
    sortH: number;
    ui: UIControls;
    derived: UIDerivedData;
    grid: InterLinkedGrid;
    hasNavbar: boolean;
    desktopMode: DesktopMode
};

type UseReturn = {
    containerHeight: number;
    positions: { left: number; top: number }[];
    visibleRange: { startIndex: number; endIndex: number };
    cssOpenWidth: string;
    cssOpenHeight: string;
    openIds: Set<string>;
    dynamicGrid: InterLinkedGrid;
    scrollItemIntoView: (index: number) => void;
    onToggleItemWithNav: (id: string, navMode: HistoryNavMode) => void;
};

// Main grid hook
export function useGrid({
    gridRef,
    controlsH,
    sortH,
    ui,
    derived,
    grid,
    hasNavbar,
    desktopMode,
}: UseParams): UseReturn {
    const { itemsSorted } = derived;
    const { isListView, sliderValue, resetAllFilters } = ui;
    const itemsLen = itemsSorted.length;
    const desktopMini = desktopMode === "mini";

    const { id: routeId } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    // Dynamic grid based on user slider value
    const dynamicGrid = useMemo(() => {
        // keep everything else from the theme grid
        const cardWidth = sliderValue + 4; // + border
        const cardHeight = sliderValue * (1 / grid.ratio) + 4 + 52 + 28; // same formula you used in theme
        return {
            ...grid,
            cardWidth,
            cardHeight,
            stackWidth: cardWidth * 0.7,
            stackHeight: cardHeight * 0.7,
        };
    }, [sliderValue, grid]);

    // Base grid sizing (cols + viewport height)
    const { cols, viewportH } = useGridLayout({ gridRef, dynamicGrid, itemsLen });
    const viewCols = isListView ? 1 : Math.max(1, cols || 1);
    const cssOpenWidth = `calc(100vw - ${!hasNavbar ? 0 : desktopMini ? dynamicGrid.navBarMiniWidth : dynamicGrid.navBarWidth}px)`;
    const cssOpenHeight = `calc(100vh - ${controlsH + sortH}px)`;

    // Open/close state
    const { openIds, toggleOpen, replaceOpen } = useGridOpenItemToggle({
        allowMultipleOpen: false,
    });

    // Build id -> index map once per items change
    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        itemsSorted.forEach((item: InterLinkedGameItem, index: number) => {
            map.set(item.id, index);
        });
        return map;
    }, [itemsSorted]);

    // Build grid rows with open items occupying dedicated full-width rows
    const { rowItems, rowIsOpen } = useMemo(() => {
        const rows: number[][] = [];
        const rowIsOpen: boolean[] = [];

        let currentRow: number[] = [];

        for (let i = 0; i < itemsLen; i++) {
            const item = itemsSorted[i];
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
    }, [itemsSorted, openIds, viewCols]);

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

        const closedHeight = isListView ? dynamicGrid.rowHeight : dynamicGrid.cardHeight;
        let y = isListView ? 0 : dynamicGrid.gap;

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

            y += height + (isListView ? 0 : dynamicGrid.gap);
        }

        const containerHeight =
            rowCount === 0
                ? dynamicGrid.gap * 2 + closedHeight
                : y - (isListView ? 0 : dynamicGrid.gap * 2);

        return {
            rowTops,
            rowHeights,
            containerHeight,
            itemRowIndex,
            itemColIndex,
        };
    }, [rowItems, rowIsOpen, itemsLen, viewportH, isListView, dynamicGrid]);

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
        const strideX = dynamicGrid.cardWidth + dynamicGrid.gap;

        for (let i = 0; i < itemsLen; i++) {
            const r = itemRowIndex[i];
            if (r == null) continue;

            const c = itemColIndex[i] ?? 0;
            out[i] = {
                left: dynamicGrid.gap + c * strideX,
                top: rowTops[r] ?? dynamicGrid.gap,
            };
        }

        return out;
    }, [itemsLen, itemRowIndex, itemColIndex, rowTops, dynamicGrid]);

    // Virtual window (variable-height rows) + scroll position
    const { visibleRange, syncScrollTopNow } = useGridVirtualWindow({
        gridRef,
        dynamicGrid,
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
    const closedHeight = isListView ? dynamicGrid.rowHeight : dynamicGrid.cardHeight;
    const openRowHeight = Math.max(closedHeight, viewportH);

    // Open/close behavior with scroll restore according to the new rules
    const { syncOpenFromRoute } = useGridScrollRestore({
        gridRef,
        openIds,
        itemsSorted,
        dynamicGrid,
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
        (id: string, navMode: HistoryNavMode) => {
            const willOpen = !openIds.has(id);
            if (itemsSorted.findIndex(item => item.id === id) === -1) resetAllFilters();

            if (willOpen) {
                // When URL is source of truth, switching/opening is done by route sync
                navigate(`/library/${id}`, { replace: navMode === "replace" });
            } else {
                navigate(`/library`, { replace: true });
            }
        },
        [openIds, itemsSorted, navigate]
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

    //         const top = rowTops[rowIdx] ?? dynamicGrid.gap;
    //         const height = rowHeights[rowIdx] ?? 0;
    //         const bottom = top + height;

    //         const activationStart = top - 100;
    //         const activationEnd = bottom;

    //         if (scrollTop >= activationStart && scrollTop <= activationEnd)
    //             return true;
    //     }

    //     return false;
    // }, [
    //     dynamicGrid.gap,
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
        cssOpenWidth,
        cssOpenHeight,
        openIds,
        dynamicGrid,
        scrollItemIntoView,
        onToggleItemWithNav,
    } as const;
}
