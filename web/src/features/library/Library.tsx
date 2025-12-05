import { useState } from "react";
import { Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { useLibraryState } from "./hooks/useLibraryState";
import { AbsoluteGrid } from "./AbsoluteGrid";
import { LoadedData, ViewMode } from "../../types/types";

type Props = {
    libraryData: LoadedData;
    view: ViewMode;
    installedUpdatedAt?: string;
    setView: (view: ViewMode) => void;
};

/**
 * Library main component.
 * Renders the library view with header controls, sorting, and item grid.
 * Props:
 * - libraryData: Loaded library data including all items, sources, tags, and series.
 * - installedUpdatedAt: Optional timestamp for when installed items were last updated.
 * - view: Current view mode (list or grid).
 * - setView: Callback to change the view mode.
 */
export default function Library({
    libraryData,
    installedUpdatedAt,
    view,
    setView,
}: Props): JSX.Element {
    const { ui, derived } = useLibraryState({ items: libraryData.items });
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: sortRef, height: sortH } = useElementSize();
    const isListView = view === "list";
    
    // Track if any open item is in view to adjust header styling
    const [hasOpenItemInView, setHasOpenItemInView] = useState(false);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-controls"
                libraryData={libraryData}
                ui={ui}
                derived={derived}
                view={view}
                setView={setView}
            />

            <HeaderSort
                sortRef={sortRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-sort"
                ui={ui}
                isListView={isListView}
                hasOpenItemInView={hasOpenItemInView}
            />

            <AbsoluteGrid
                view={view}
                ui={ui}
                derived={derived}
                controlsH={controlsH}
                sortH={sortH}
                installedUpdatedAt={installedUpdatedAt}
                setHasOpenItemInView={setHasOpenItemInView}
            />
        </Flex>
    );
}
