import * as React from "react";
import { Box, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { VirtuosoGrid } from "react-virtuoso";

import { ViewMode } from "../../lib/types";
import { ExpandableItemWrapper } from "../../components/ExpandableItem";
import type { LoadedData } from "../hooks/useLibrary";
import { useJumpToScroll } from "../hooks/useJumpToScroll";
import { useCollapseOpenToggle } from "../hooks/useCollapseOpenToggle";
import { useLibraryState } from "../hooks/useLibraryState";
import { useRemountKeys } from "../hooks/useRemountKeys";
import { HeaderControls } from "./HeaderControls";
import { HeaderSort } from "./HeaderSort";
import { Scroller } from "../../components/Scroller";

type Props = {
    data: LoadedData;
    onCountsChange?: (filtered: number, total: number) => void;
    view: ViewMode;
    setView: (view: ViewMode) => void;
    filteredCount: number;
    totalCount: number;
    installedUpdatedAt?: string;
};

export default function LibraryGrid({
    data,
    onCountsChange,
    view,
    setView,
    filteredCount,
    totalCount,
    installedUpdatedAt,
}: Props) {
    const overscan = { top: 600, bottom: 800 } as const;

    // derived / filtered items
    const { ui, derived } = useLibraryState(data);
    const items = derived.itemsSorted;

    // header heights for computing topOffset passed into ExpandableItemWrapper
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();

    // open-state
    const { openIds, everOpenedIds, toggleOpen } = useCollapseOpenToggle();

    // virtuoso helpers
    const { virtuosoRef, setScrollerEl, scrollRowIntoView } = useJumpToScroll({
        headerH,
    });

    // let parent know counts
    React.useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    // --- Scroll lock logic refs ---
    // We need to:
    // - detect user scroll while something is open
    // - close everything
    // - prevent that specific scroll movement
    //
    // We also need to *not* instantly close right after opening (because we
    // call scrollRowIntoView which itself scrolls).

    // ref to the actual scrollable element Virtuoso uses
    const scrollerElRef = React.useRef<HTMLElement | null>(null);

    // timestamp after which scroll is allowed to trigger close
    // when we open an item, we set this ~200ms in the future to ignore that initial programmatic scroll
    const ignoreScrollUntilRef = React.useRef<number>(0);

    // true if we currently have "scroll lock" armed (i.e. something is open)
    const scrollLockArmedRef = React.useRef<boolean>(false);

    // the scrollTop we want to snap back to if user tries to scroll while open
    const baselineScrollTopRef = React.useRef<number>(0);

    // guard so we don't re-entrantly handle scroll while we're in the middle of closing
    const closingInProgressRef = React.useRef<boolean>(false);

    // Hook Virtuoso's scrollerRef so we also capture the element locally
    const handleSetScrollerEl = React.useCallback(
        (el: HTMLElement | null) => {
            scrollerElRef.current = el;
            setScrollerEl(el);
        },
        [setScrollerEl]
    );

    // Close ALL open cards
    const closeAllOpenCards = React.useCallback(() => {
        if (openIds.size === 0) return;
        const idsToClose = Array.from(openIds);
        idsToClose.forEach((id) => {
            // toggleOpen will close an already-open id
            toggleOpen(id);
        });
    }, [openIds, toggleOpen]);

    // When user toggles a grid card
    const onToggleGrid = React.useCallback(
        (id: string, index: number) => {
            toggleOpen(id, () => {
                // This callback only runs when we OPEN the card (not when we close),
                // based on your hook's semantics.

                // 1. Set a small grace window so programmatic scroll doesn't instantly close it.
                ignoreScrollUntilRef.current = performance.now() + 200;

                // 2. After scrollRowIntoView runs and settles, record baselineScrollTop
                requestAnimationFrame(() => {
                    scrollRowIntoView(index, false);

                    // capture baseline scrollTop on next frame when we're positioned
                    requestAnimationFrame(() => {
                        if (scrollerElRef.current) {
                            baselineScrollTopRef.current =
                                scrollerElRef.current.scrollTop;
                        }
                    });
                });
            });
        },
        [toggleOpen, scrollRowIntoView]
    );

    // Keep scrollLockArmedRef + baselineScrollTopRef updated when openIds changes
    React.useEffect(() => {
        if (openIds.size > 0) {
            scrollLockArmedRef.current = true;
            // if for some reason we didn't already capture baseline (e.g. openIds restored),
            // snapshot it now.
            if (scrollerElRef.current) {
                if (!baselineScrollTopRef.current) {
                    baselineScrollTopRef.current =
                        scrollerElRef.current.scrollTop;
                }
            }
        } else {
            scrollLockArmedRef.current = false;
            baselineScrollTopRef.current = 0;
        }
    }, [openIds]);

    // Attach our scroll interception logic to the scroller element
    // Attach our scroll interception logic to the scroller element
    React.useEffect(() => {
        const el = scrollerElRef.current;
        if (!el) return;

        function handleScroll() {
            // re-check on every scroll in case el was detached
            const node = scrollerElRef.current;
            if (!node) return;

            const now = performance.now();

            // if nothing is open or we're already in the middle of closing, do nothing
            if (
                !scrollLockArmedRef.current ||
                closingInProgressRef.current
            ) {
                return;
            }

            // If we're within grace period after opening, ignore (let the bounce settle)
            if (now < ignoreScrollUntilRef.current) {
                // also update baseline to the most recent "settled" scrollTop
                baselineScrollTopRef.current = node.scrollTop;
                return;
            }

            // At this point:
            // - something is open
            // - user is now trying to scroll
            // → we close everything AND cancel this scroll attempt

            closingInProgressRef.current = true;

            // close all open cards
            closeAllOpenCards();

            // snap scrollTop back to where it was before the user's wheel/touch
            const baseline = baselineScrollTopRef.current;
            node.scrollTop = baseline ?? 0;

            // small async clear so future scrolls work again if user scrolls after close
            requestAnimationFrame(() => {
                closingInProgressRef.current = false;
                // lock is now disarmed because openIds will be empty after closeAllOpenCards
            });
        }

        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", handleScroll);
        };
    }, [closeAllOpenCards]);


    // force VirtuosoGrid remount when filters/sort/etc change
    const { flatKey } = useRemountKeys({
        filteredCount: derived.filteredCount,
        q: ui.q,
        sources: ui.sources,
        tags: ui.tags,
        series: ui.series,
        showHidden: ui.showHidden,
        installedOnly: ui.installedOnly,
        sortKey: ui.sortKey,
        sortDir: ui.sortDir,
    });

    // VirtuosoGrid components
    const List = React.useMemo(() => {
        const Comp = React.forwardRef<
            HTMLDivElement,
            React.HTMLAttributes<HTMLDivElement> & { context?: unknown }
        >((props, ref) => {
            const { style, children, ...rest } = props;
            return (
                <div
                    {...rest}
                    ref={ref}
                    style={{
                        ...(style || {}),
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 12,
                        alignContent: "start",
                        boxSizing: "border-box",
                    }}
                >
                    {children}
                </div>
            );
        });

        Comp.displayName = "CoverGridList";
        return Comp;
    }, []);

    const Item = React.useMemo(() => {
        const Comp = React.forwardRef<
            HTMLDivElement,
            React.HTMLAttributes<HTMLDivElement> & { context?: unknown }
        >((props, ref) => {
            const firstChild = React.Children.toArray(props.children)[0] as any;
            const isOpen =
                firstChild &&
                firstChild.props &&
                firstChild.props.collapseOpen === true;

            const { style, ...rest } = props;

            return (
                <div
                    {...rest}
                    ref={ref}
                    style={{
                        ...(style || {}),
                        ...(isOpen ? { gridColumn: "1 / -1" } : null),
                    }}
                />
            );
        });

        Comp.displayName = "CoverGridItem";
        return Comp;
    }, []);

    return (
        <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
            {/* Filters / view / counts / etc */}
            <HeaderControls
                controlsRef={controlsRef as any}
                filteredCount={filteredCount}
                totalCount={totalCount}
                allSources={data.allSources}
                allTags={data.allTags}
                allSeries={data.allSeries}
                view={view}
                setView={setView}
                {...ui}
            />

            {/* Sort row under the controls */}
            <HeaderSort
                headerRef={headerRef as any}
                top={controlsH}
                sortKey={ui.sortKey}
                sortDir={ui.sortDir}
                onToggleSort={ui.toggleSort}
                gridColumns={"repeat(auto-fill, minmax(140px, 1fr))"}
            />

            {/* Scroll region */}
            <Box
                style={{
                    flex: 1,
                    minHeight: 0,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <VirtuosoGrid
                    ref={virtuosoRef as any}
                    key={flatKey}
                    style={{ height: "100%" }}
                    totalCount={items.length}
                    components={{ Scroller, List, Item }}
                    computeItemKey={(index) =>
                        `${items[index].id}|${installedUpdatedAt ?? ""}`
                    }
                    increaseViewportBy={overscan}
                    scrollerRef={handleSetScrollerEl}
                    // we no longer need rangeChanged to drive close logic
                    itemContent={(index) => {
                        const item = items[index];
                        const isOpen = openIds.has(item.id);
                        const wasOpened = everOpenedIds.has(item.id);

                        return (
                            <ExpandableItemWrapper
                                item={item}
                                collapseOpen={isOpen}
                                everOpened={wasOpened}
                                topOffset={controlsH + headerH}
                                isGroupedList={false}
                                layout="grid"
                                onToggle={() => onToggleGrid(item.id, index)}
                            />
                        );
                    }}
                />
            </Box>
        </Flex>
    );
}
