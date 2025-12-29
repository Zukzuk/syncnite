import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGridVirtualWindow } from "./useGridVirtualWindow";
import { useGridOpenItemToggle } from "./useGridOpenItemToggle";
import { useGridScrollRestore } from "./useGridScrollRestore";
import { HistoryNavMode, ItemPositions, UIControls, UIDerivedData } from "../../../types/app";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";

type UseParams = {
    gridRef: RefObject<HTMLDivElement>;
    ui: UIControls;
    derived: UIDerivedData;
    grid: InterLinkedGrid;
    isListView: boolean;
};

type UseReturn = {
    openIds: Set<string>;
    dynamicGrid: InterLinkedDynamicGrid;
    scrollItemIntoView: (index: number) => void;
    onToggleItemWithNav: (id: string, navMode: HistoryNavMode) => void;
};

// Main grid hook
export function useGrid({
    gridRef,
    ui,
    derived,
    grid,
}: UseParams): UseReturn {
    const { itemsSorted } = derived;
    const { isListView, sliderValue, resetAllFilters } = ui;
    const itemsLen = itemsSorted.length;

    const { id: routeId } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    // Base grid sizing (cols + viewport height)
    const [gridViewportW, setW] = useState(0);
    const [gridViewportH, setH] = useState(0);

    useLayoutEffect(() => {
        const el = gridRef.current;
        if (!el) return;

        const onSize = () => {
            const rect = el.getBoundingClientRect();
            setW(Math.max(grid.minSiteWidth, Math.floor(rect.width)));
            setH(Math.max(0, Math.floor(rect.height)));
        };

        const ro = new ResizeObserver(onSize);
        ro.observe(el);
        onSize();

        return () => ro.disconnect();
    }, []);

    const { 
        gridCardHeight,
        gridCardWidth,
        deckAndStacksHeight,
        deckAndStacksWidth,
        deckCardHeight,
        deckCardWidth,
        stackCardHeight,
        stackCardWidth,
        numOfCols,
        strideX,
        cardStepY,
    } = useMemo(() => {
        const gridCardWidth = sliderValue + 4;
        const gridCardHeight = sliderValue * (1 / grid.ratio) + 4 + grid.gridCardBottom;
        const deckCardWidth = sliderValue;
        const deckCardHeight = deckCardWidth * (1 / grid.ratio);
        const deckAndStacksWidth = gridViewportW - grid.gap - grid.detailsPanelWidth - grid.gapMd * 2 - grid.gapLg - grid.scrollbarWidth;
        const deckAndStacksHeight = gridViewportH - grid.rowHeight;
        const stackCardWidth = gridCardWidth * 0.7;
        const stackCardHeight = gridCardHeight * 0.7;
        const strideX = gridCardWidth + grid.gap;
        const cardStepY = gridCardHeight / 3;
        const numOfCols = isListView ? 1 : Math.max(1, Math.floor((gridViewportW - grid.scrollbarWidth) / strideX));

        return {
            gridViewportW,
            gridViewportH,
            deckAndStacksWidth,
            deckAndStacksHeight,
            gridCardWidth,
            gridCardHeight,
            deckCardWidth,
            deckCardHeight,
            stackCardWidth,
            stackCardHeight,
            numOfCols,
            strideX,
            cardStepY,
        };
    }, [gridViewportW, gridViewportH, sliderValue, isListView]);

    // Build id -> index map once per items change
    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        itemsSorted.forEach((item: InterLinkedGameItem, index: number) => {
            map.set(item.id, index);
        });
        return map;
    }, [itemsSorted]);

    // Open/close state
    const { openIds, toggleOpen, replaceOpen } = useGridOpenItemToggle({
        allowMultipleOpen: false,
    });

    // Build grid rows with open items occupying full width
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
                if (currentRow.length === numOfCols) {
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
    }, [itemsSorted, openIds, numOfCols, itemsLen]);

    // Compute row layout
    const {
        rowTops,
        rowHeights,
        gridTotalHeight,
        itemRowIndex,
        itemColIndex,
    } = useMemo(() => {
        const rowCount = rowItems.length;
        const rowTops = new Array<number>(rowCount);
        const rowHeights = new Array<number>(rowCount);
        const itemRowIndex = new Array<number>(itemsLen);
        const itemColIndex = new Array<number>(itemsLen);

        const closedHeight = isListView ? grid.rowHeight : gridCardHeight;
        let yOffset = isListView ? 0 : grid.gap;

        for (let r = 0; r < rowCount; r++) {
            rowTops[r] = yOffset;
            const openHeight = Math.max(closedHeight, gridViewportH);
            const height = rowIsOpen[r] ? openHeight : closedHeight;
            rowHeights[r] = height;

            const indices = rowItems[r];
            for (let c = 0; c < indices.length; c++) {
                const idx = indices[c];
                itemRowIndex[idx] = r;
                itemColIndex[idx] = c;
            }

            yOffset += height + (isListView ? 0 : grid.gap);
        }

        const gridTotalHeight =
            rowCount === 0
                ? grid.gap * 2 + closedHeight
                : yOffset - (isListView ? 0 : grid.gap * 2);

        return {
            rowTops,
            rowHeights,
            gridTotalHeight,
            itemRowIndex,
            itemColIndex,
        };
    }, [rowItems, rowIsOpen, isListView, gridViewportH, gridCardHeight, itemsLen]);

    // Per-row first/last item indices
    const rowFirstItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[0] : 0)),
        [rowItems]
    );
    const rowLastItemIndex = useMemo(
        () => rowItems.map((row) => (row.length ? row[row.length - 1] + 1 : 0)),
        [rowItems]
    );

    // Virtual window (variable-height rows) + scroll position
    const { visibleRange, syncScrollTopNow } = useGridVirtualWindow({
        gridRef,
        grid,
        rows: rowTops.length,
        cols: numOfCols,
        itemsLen,
        rowTops,
        rowHeights,
        containerHeight: gridTotalHeight,
        viewportH: gridViewportH,
        rowFirstItemIndex,
        rowLastItemIndex,
    });

    // Compute absolute item positions
    const positions = useMemo(() => {
        const out: ItemPositions = new Array(itemsLen);

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
    }, [itemsLen, itemRowIndex, itemColIndex, rowTops, strideX]);

    // Jump-to-scroll, based on positions
    const scrollItemIntoView = useCallback((index: number) => {
        const el = gridRef.current;
        if (!el) return;

        const top = positions[index]?.top ?? 0;
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const target = Math.max(0, Math.min(top, maxTop));

        el.scrollTo({ top: target, behavior: "auto" });
    }, [gridRef, positions]);

    // Heights needed for restore logic
    const closedHeight = isListView ? grid.rowHeight : gridCardHeight;
    const openRowHeight = Math.max(closedHeight, gridViewportH);

    // Open/close behavior with scroll restore according to the new rules
    const { syncOpenFromRoute } = useGridScrollRestore({
        gridRef,
        openIds,
        itemsSorted,
        grid,
        idToIndex,
        viewportH: gridViewportH,
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

    // keep open item in view on layout changes
    const layoutRef = useRef({
        viewportH: gridViewportH,
        containerHeight: gridTotalHeight,
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
        const next = { viewportH: gridViewportH, containerHeight: gridTotalHeight, itemsLen };

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
        gridViewportH,
        gridTotalHeight,
        itemsLen,
        openIds,
        idToIndex,
        scrollItemIntoView,
    ]);

    return {
        openIds,
        dynamicGrid: {
            gridCardHeight,
            gridCardWidth,
            gridViewportH,
            gridViewportW,
            deckAndStacksHeight,
            deckAndStacksWidth,
            deckCardHeight,
            deckCardWidth,
            stackCardHeight,
            stackCardWidth,
            numOfCols,
            strideX,
            cardStepY,
            gridTotalHeight,
            positions,
            visibleRange,
        },
        scrollItemIntoView,
        onToggleItemWithNav,
    } as const;
}
