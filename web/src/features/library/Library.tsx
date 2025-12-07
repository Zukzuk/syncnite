import { useState } from "react";
import { Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { useLibraryState } from "./hooks/useLibraryState";
import { AbsoluteGrid } from "./AbsoluteGrid";
import { LoadedData } from "../../types/types";

type Props = {
    libraryData: LoadedData;
    installedUpdatedAt?: string;
};

/**
 * Library main component.
 * Renders the library view with header controls, sorting, and item grid.
 * Props:
 * - libraryData: Loaded library data including all items, sources, tags, and series.
 * - installedUpdatedAt: Optional timestamp for when installed items were last updated.
 */
export default function Library({
    libraryData,
    installedUpdatedAt,
}: Props): JSX.Element {
    const { uiControls, derivedData } = useLibraryState(libraryData.items);
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: sortRef, height: sortH } = useElementSize();
    const isListView = uiControls.view === "list";

    // Track if any open item is in view to adjust header styling
    const [hasOpenItemInView, setHasOpenItemInView] = useState(false);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-controls"
                libraryData={libraryData}
                ui={uiControls}
                derived={derivedData}
            />

            <HeaderSort
                sortRef={sortRef as unknown as (el: HTMLElement | null) => void}
                aria-label="header-sort"
                ui={uiControls}
                isListView={isListView}
                hasOpenItemInView={hasOpenItemInView}
            />

            <AbsoluteGrid
                ui={uiControls}
                derived={derivedData}
                controlsH={controlsH}
                sortH={sortH}
                installedUpdatedAt={installedUpdatedAt}
                setHasOpenItemInView={setHasOpenItemInView}
            />
        </Flex>
    );
}
