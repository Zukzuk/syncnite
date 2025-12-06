import { Box } from "@mantine/core";
import { GRID } from "../../../lib/constants";
import { AssociatedDeckMeta } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedStackCard } from "./AssociatedStackCard";


type Props = {
    allDecks: AssociatedDeckMeta[];
    openDeckKey: string | null;
    columns: number;
    onDeckClick: (key: string) => void;
};

export function AssociatedStacks({
    allDecks,
    openDeckKey,
    columns,
    onDeckClick,
}: Props): JSX.Element | null {
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 210 });

    if (!allDecks.length || columns <= 0) return null;

    return (
        <Box
            className="subtle-scrollbar"
            pl={4}
            style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
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
                    gridTemplateColumns: `repeat(${columns}, ${GRID.cardWidth}px)`,
                    gap: GRID.gap,
                    justifyContent: "flex-start",
                    alignContent: "flex-start",
                }}
            >
                {allDecks.map((deck) => (
                    <AssociatedStackCard
                        key={deck.key}
                        deck={deck}
                        isOpen={openDeckKey === deck.key}
                        onClick={() => onDeckClick(deck.key)}
                    />
                ))}
            </Box>
        </Box>
    );
}
