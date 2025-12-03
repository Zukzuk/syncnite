import { useState } from "react";
import { Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { useLibraryState } from "./hooks/useLibraryState";
import { LoadedData, ViewMode } from "../../types/types";
import { LibraryGridItems } from "./LibraryGridItems";

type Props = {
    libraryData: LoadedData;
    view: ViewMode;
    installedUpdatedAt?: string;
    setView: (view: ViewMode) => void;
};

/**
 * Absolute-positioned library grid with expandable items, virtual scrolling
 * and alphabetical rail navigation.
 */
export default function LibraryGrid({
    libraryData,
    installedUpdatedAt,
    view,
    setView,
}: Props): JSX.Element {
    const { ui, derived } = useLibraryState({ items: libraryData.items });
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: sortRef, height: sortH } = useElementSize();

    const { filteredCount, totalCount } = derived;
    const { sortKey, sortDir, onToggleSort } = ui;
    const isListView = view === "list";

    // Only piece of scroll-related state that the header cares about
    const [hasOpenItemInView, setHasOpenItemInView] = useState(false);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-controls"
                view={view}
                {...ui}
                filteredCount={filteredCount}
                totalCount={totalCount}
                allSources={libraryData.allSources}
                allTags={libraryData.allTags}
                allSeries={libraryData.allSeries}
                setView={setView}
            />

            <HeaderSort
                sortRef={sortRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-sort"
                sortKey={sortKey}
                sortDir={sortDir}
                isListView={isListView}
                hasOpenItemInView={hasOpenItemInView}
                onToggleSort={onToggleSort}
            />

            <LibraryGridItems
                view={view}
                ui={ui}
                derived={derived}
                controlsH={controlsH}
                sortH={sortH}
                installedUpdatedAt={installedUpdatedAt}
                onOpenItemVisibilityChange={setHasOpenItemInView}
            />
        </Flex>
    );
}
