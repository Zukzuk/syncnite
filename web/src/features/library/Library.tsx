import { useState } from "react";
import { Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "../../components/HeaderSort";
import { HeaderControls } from "../../components/HeaderControls";
import { useLibraryState } from "./hooks/useLibraryState";
import { AbsoluteGrid } from "./AbsoluteGrid";
import { LoadedData } from "../../types/types";

type Props = {
    libraryData: LoadedData;
    installedUpdatedAt?: string;
};

// Main library component that sets up state and layout for the library view.
export default function Library({
    libraryData,
    installedUpdatedAt,
}: Props): JSX.Element {
    const { uiControls, derivedData } = useLibraryState(libraryData.items);
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: sortRef, height: sortH } = useElementSize();

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                libraryData={libraryData}
                ui={uiControls}
                derived={derivedData}
            />

            <HeaderSort
                sortRef={sortRef as unknown as (el: HTMLElement | null) => void}
                ui={uiControls}
            />

            <AbsoluteGrid
                ui={uiControls}
                derived={derivedData}
                controlsH={controlsH}
                sortH={sortH}
                installedUpdatedAt={installedUpdatedAt}
            />
        </Flex>
    );
}
