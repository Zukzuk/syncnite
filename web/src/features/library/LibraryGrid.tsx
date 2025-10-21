import * as React from "react";
import { Box, Card, Flex, Image, Text } from "@mantine/core";
import { VirtuosoGrid, type VirtuosoGridHandle } from "react-virtuoso";
import { Scroller } from "../../components/Scroller";
import type { LoadedData, Row } from "../hooks/useLibrary";
import { HeaderControls } from "./HeaderControls";
import { useJumpToScroll } from "../hooks/useJumpToScroll";
import { useCollapseOpenToggle } from "../hooks/useCollapseOpenToggle";
import { useLibraryState } from "../hooks/useLibraryState";
import { useElementSize } from "@mantine/hooks";
import { useAlphabetGroups } from "../hooks/useAlphabetGroups";
import { useAlphabetRail } from "../hooks/useAlphabetRail";
import { useRemountKeys } from "../hooks/useRemountKeys";
import { ViewMode } from "../../pages/LibraryPage";

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
    const { ui, derived } = useLibraryState(data);
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: headerRef, height: headerH } = useElementSize();
    const { openIds, everOpenedIds, toggleOpen } = useCollapseOpenToggle();
    const { virtuosoRef, setScrollerEl, scrollRowIntoView } = useJumpToScroll({ headerH });

    React.useEffect(() => {
        onCountsChange?.(derived.filteredCount, derived.totalCount);
    }, [derived.filteredCount, derived.totalCount, onCountsChange]);

    const onToggleGrouped = React.useCallback(
        (id: string, globalIndex: number) => {
            toggleOpen(id, () => requestAnimationFrame(() => scrollRowIntoView(globalIndex, true)));
        },
        [toggleOpen, scrollRowIntoView]
    );

    const onToggleFlat = React.useCallback(
        (id: string, index: number) => {
            toggleOpen(id, () => requestAnimationFrame(() => scrollRowIntoView(index, false)));
        },
        [toggleOpen, scrollRowIntoView]
    );

    const { groups, isGrouped, flatItems } = useAlphabetGroups({
        sortKey: ui.sortKey,
        withBuckets: derived.withBuckets,
        rowsSorted: derived.rowsSorted,
    });

    const { counts, activeLetter, handleJump, rangeChanged } = useAlphabetRail(
        { isGrouped, groups, flatItems, virtuosoRef }
    );

    const { groupedKey, flatKey } = useRemountKeys({
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

    // Container & item wrappers as recommended by react-virtuoso for grid layouts
    const List = React.useMemo(
        () =>
            React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
                <div
                    {...props}
                    ref={ref}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 8,
                        padding: 8,
                        paddingRight: 0,
                        alignContent: "start",
                        height: "100%",
                        boxSizing: "border-box",
                        ...(props.style || {}),
                    }}
                />
            )),
        []
    );
    List.displayName = "CoverGridList";

    const Item = React.useMemo(
        () =>
            React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
                <div {...props} ref={ref} style={{ ...(props.style || {}) }} />
            )),
        []
    );
    Item.displayName = "CoverGridItem";

    const rows = derived.rowsSorted;

    return (
        <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                filteredCount={filteredCount}
                totalCount={totalCount}
                allSources={data.allSources}
                allTags={data.allTags}
                allSeries={data.allSeries}
                view={view}
                setView={setView}
                {...ui}
            />
            
            <Box style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
                <VirtuosoGrid
                    ref={virtuosoRef as any}
                    key={flatKey}
                    style={{ height: "100%" }}
                    totalCount={rows.length}
                    components={{ Scroller, List, Item }}
                    computeItemKey={(index) => `${rows[index].id}|${installedUpdatedAt ?? ""}`}
                    itemContent={(index) => <CoverCard row={rows[index]} />}
                    increaseViewportBy={overscan}
                />
            </Box>
        </Flex>
    );
}

// Minimal Mantine Card for a single cover — kept intentionally bare.
function CoverCard({ row }: { row: Row }) {
    const src = row.coverUrl || row.iconUrl || "";
    return (
        <Card withBorder p={2} radius="sm">
            <div style={{ position: "relative", aspectRatio: "23 / 32" }}>
                <Image
                    src={src}
                    alt={row.title}
                    fit="cover"
                    loading="lazy"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                />
            </div>
            <Text size="sm" m={6} lineClamp={2} title={row.title} fw={600} h={40}>
                {row.title}
            </Text>
            {row.year && (
                <Text m={6} mt={0} style={{ fontSize: 13 }}>{row.year}</Text>
            )}
        </Card>
    );
}
