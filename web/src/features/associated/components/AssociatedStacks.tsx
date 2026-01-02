import { Box, Text } from "@mantine/core";
import { AssociatedItems } from "../../../types/app";
import { InterLinkedDynamicGrid, InterLinkedGrid } from "../../../types/interlinked";
import { AssociatedStackCard } from "./AssociatedStackCard";
import { HtmlBox } from "../../../components/HtmlBox";

type Props = {
    associatedData: AssociatedItems[];
    openDeckKey: string | null;
    stackColumns: number;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    isDark: boolean;
    needsColumnLayout: boolean;
    stackCardWidthUsed: number;
    description?: string;
    colsFitAtMaxWidth: number;
    onStackClick: (key: string) => void;
};

export function AssociatedStacks({
    associatedData,
    openDeckKey,
    stackColumns,
    grid,
    dynamicGrid,
    isDark,
    needsColumnLayout,
    stackCardWidthUsed,
    description,
    colsFitAtMaxWidth,
    onStackClick,
}: Props): JSX.Element | null {
    if (!!dynamicGrid && !associatedData.length || stackColumns <= 0) return null;

    return (
        <Box
            className={needsColumnLayout ? undefined : "subtle-scrollbar"}
            pl={4}
            style={{
                minWidth: dynamicGrid.stackCardWidth,
                width: "100%",
                marginTop: 22,
                height: "calc(100% - 22px)",
                overflowX: "hidden",
                overflowY: needsColumnLayout ? "hidden" : "auto",
                overscrollBehaviorY: needsColumnLayout ? undefined : "contain",
            }}
        >
            <Box
                style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: `repeat(${stackColumns}, minmax(0, ${stackCardWidthUsed}px))`,
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
            <Text
                mt={grid.gap * 2}
                mb={grid.gap}
                size="xs"
                c="var(--interlinked-color-primary)"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 14,
                }}
            >
                Description
            </Text>
            <HtmlBox 
                grid={grid} 
                html={description ?? ''}
                stackCardWidthUsed={stackCardWidthUsed}
                colsFitAtMaxWidth={colsFitAtMaxWidth}
            />
        </Box>
    );
}
