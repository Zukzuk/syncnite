import { Box } from "@mantine/core";
import { usePersistedScrollTop } from "../hooks/usePersistedScrollTop";
import { AssociatedItems } from "../../../../../types/app";
import { InterLinkedGrid } from "../../../../../types/interlinked";
import { useLibraryContext } from "../../../LibraryContext";
import { useDelayedFlag } from "../../../../hooks/useDelayedFlag";
import { AssociatedStackCard } from "./AssociatedStackCard";

type Props = {
    currentItemId: string;
    associatedData: AssociatedItems[];
    openDeckKey: string | null;
    stackColumns: number;
    grid: InterLinkedGrid;
    isDark: boolean;
    onStackClick: (key: string) => void;
};

export function AssociatedStacks({
    currentItemId,
    associatedData,
    openDeckKey,
    stackColumns,
    grid,
    isDark,
    onStackClick,
}: Props): JSX.Element | null {
    if (!associatedData.length || stackColumns <= 0) return null;

    const lib = useLibraryContext();

    const { scrollRef, onScroll } = usePersistedScrollTop({
        key: currentItemId,
        get: () => lib.getStacksScrollTop(currentItemId),
        set: (top: number) => lib.setStacksScrollTop(currentItemId, top),
    });

    return (
        <Box
            ref={scrollRef}
            onScroll={onScroll}
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
                    gridTemplateColumns: `repeat(${stackColumns}, ${grid.stackWidth}px)`,
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
                        isDark={isDark}
                        onStackClick={onStackClick}
                    />
                ))}
            </Box>
        </Box>
    );
}
