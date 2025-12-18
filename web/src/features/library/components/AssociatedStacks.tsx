import { Box } from "@mantine/core";
import { AssociatedItems } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedStackCard } from "./AssociatedStackCard";
import { getTheme } from "../../../theme";

type Props = {
    associatedDecks: AssociatedItems[];
    openDeckKey: string | null;
    stackColumns: number;
    onStackClick: (key: string) => void;
};

// Component to display associated stacks of decks in the library view.
export function AssociatedStacks({
    associatedDecks,
    openDeckKey,
    stackColumns,
    onStackClick,
}: Props): JSX.Element | null {
    if (!associatedDecks.length || stackColumns <= 0) return null;

    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 210 });
    const { GRID } = getTheme();
    
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
                opacity: isOpenDelayed ? 1 : 0,
                transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        >
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${stackColumns}, ${GRID.cardWidth * 0.7}px)`,
                    gap: GRID.gap,
                    justifyContent: "flex-start",
                    alignContent: "flex-start",
                }}
            >
                {associatedDecks.map((stack) => (
                    <AssociatedStackCard
                        key={stack.key}
                        stack={stack}
                        isOpen={openDeckKey === stack.key}
                        onStackClick={onStackClick}
                    />
                ))}
            </Box>
        </Box>
    );
}
