import { Flex } from "@mantine/core";
import { HeaderSort } from "./components/HeaderSort";
import { HeaderControls } from "./components/HeaderControls";
import type { InterLinkedData, InterLinkedTheme, InterLinkedItem } from "../../types/interlinked";
import { useLibraryState } from "./hooks/useLibraryState";
import { Grid } from "../grid/Grid";

type Props = {
    theme: InterLinkedTheme;
    libraryData: InterLinkedData;
};

export default function Library({ libraryData, theme }: Props): JSX.Element {
    const { uiControls, derivedData } = useLibraryState(libraryData);

    return (
        <Flex direction="column" style={{ width: "100%", height: "100%" }}>
            <HeaderControls libraryData={libraryData} theme={theme} ui={uiControls} derived={derivedData} />
            <HeaderSort theme={theme} ui={uiControls} />
            <Grid theme={theme} ui={uiControls} derived={derivedData} />
        </Flex>
    );
}
