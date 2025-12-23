import { Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { Grid } from "../grid/Grid";
import { InterLinkedData, InterLinkedTheme } from "../../types/interlinked";
import { useLibraryState } from "./hooks/useLibraryState";

type Props = {
    theme: InterLinkedTheme;
    libraryData: InterLinkedData;
    installedUpdatedAt?: string;
};

// Main library component that sets up state and layout for the library view.
export default function Library({
    libraryData,
    theme,
    installedUpdatedAt,
}: Props): JSX.Element {
    // Hardcoded to Playnite for now
    const items = libraryData.playnite?.items ?? [];

    const { uiControls, derivedData } = useLibraryState(items);
    const { ref: controlsRef, height: controlsH } = useElementSize();
    const { ref: sortRef, height: sortH } = useElementSize();

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                controlsRef={controlsRef as unknown as (el: HTMLElement | null) => void}
                theme={theme}
                libraryData={libraryData}
                ui={uiControls}
                derived={derivedData}
            />

            <HeaderSort
                sortRef={sortRef as unknown as (el: HTMLElement | null) => void}
                theme={theme}
                ui={uiControls}
            />

            <Grid
                ui={uiControls}
                derived={derivedData}
                theme={theme}
                controlsH={controlsH}
                sortH={sortH}
                installedUpdatedAt={installedUpdatedAt}
            />
        </Flex>
    );
}
