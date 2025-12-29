import { Flex } from "@mantine/core";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import { InterLinkedData, InterLinkedTheme } from "../../../types/interlinked";
import { useLibraryState } from "./hooks/useLibraryState";
import { Grid } from "../grid/Grid";

type Props = {
    theme: InterLinkedTheme;
    libraryData: InterLinkedData;
};

// Main library component that sets up state and layout for the library view.
export default function Library({
    libraryData,
    theme,
}: Props): JSX.Element {
    // Hardcoded to Playnite for now
    const items = libraryData?.playnite?.items ?? [];
    const { uiControls, derivedData } = useLibraryState(items);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls
                libraryData={libraryData}
                theme={theme}
                ui={uiControls}
                derived={derivedData}
            />

            <HeaderSort
                theme={theme}
                ui={uiControls}
            />

            <Grid
                theme={theme}
                ui={uiControls}
                derived={derivedData}
            />
        </Flex>
    );
}
