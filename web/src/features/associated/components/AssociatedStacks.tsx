import { Box } from "@mantine/core";
import { AssociatedItems } from "../../../types/app";
import { InterLinkedDynamicGrid, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedStackCard } from "./AssociatedStackCard";

type Props = {
    associatedData: AssociatedItems[];
    openDeckKey: string | null;
    stackColumns: number;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    isDark: boolean;
    onStackClick: (key: string) => void;
};

export function AssociatedStacks({
    associatedData,
    openDeckKey,
    stackColumns,
    grid,
    dynamicGrid,
    isDark,
    onStackClick,
}: Props): JSX.Element | null {
    if (!associatedData.length || stackColumns <= 0) return null;

    return (
        <Box
            className="subtle-scrollbar"
            pl={4}
            style={{
                flex: 1,
                minWidth: 0,
                marginTop: 22,
                height: "calc(100% - 22px)",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehaviorY: "contain",
            }}
        >
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${stackColumns}, ${dynamicGrid.stackCardWidth}px)`,
                    gap: grid.gap,
                    justifyContent: "flex-start",
                    alignContent: "flex-start",
                }}
            >
                {associatedData.map((stack) => (
                    <AssociatedStackCard
                        key={stack.key}
                        stack={stack}
                        isOpen={openDeckKey === stack.key}
                        grid={grid}
                        dynamicGrid={dynamicGrid}
                        isDark={isDark}
                        onStackClick={onStackClick}
                    />
                ))}
            </Box>
        </Box>
    );
}
