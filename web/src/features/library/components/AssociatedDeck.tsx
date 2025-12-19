import React from "react";
import { Badge, Box, Stack, Text } from "@mantine/core";
import { GameItem, NavMode } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedDeckCard } from "./AssociatedDeckCard";
import { getTheme } from "../../../theme";

type Props = {
    label: string;
    currentItemId: string;
    items: GameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    onToggleClickBounded: (id?: string, navMode?: NavMode) => void;
};

// Component to display an associated deck of items in the library view.
export function AssociatedDeck({
    label,
    currentItemId,
    items,
    deckColumns,
    maxCardsPerColumn,
    onToggleClickBounded,
}: Props): JSX.Element | null {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 140 });
    const { isDark, GRID } = getTheme();

    const cards = items.filter((g) => g.coverUrl);
    if (cards.length === 0 || deckColumns <= 0) return null;

    const colCount = Math.max(1, deckColumns);
    const total = cards.length;

    let cardsPerColumn: number;
    if (maxCardsPerColumn && maxCardsPerColumn > 0) {
        const maxTotalCapacity = colCount * maxCardsPerColumn;
        if (total <= maxTotalCapacity) {
            cardsPerColumn = Math.min(
                maxCardsPerColumn,
                Math.ceil(total / colCount)
            );
        } else {
            cardsPerColumn = Math.ceil(total / colCount);
        }
    } else {
        cardsPerColumn = Math.ceil(total / colCount);
    }

    const cardHeight = (GRID.cardWidth * 32) / 23;
    const columnHeight =
        cardsPerColumn > 0
            ? cardHeight + GRID.cardStepY * (cardsPerColumn - 1)
            : 0;

    const cardMeta = cards.map((c, index) => {
        const colIndex = Math.floor(index / cardsPerColumn);
        const indexInColumn = index % cardsPerColumn;
        return { id: c.id, metaIndex: index, colIndex, indexInColumn };
    });

    const colLengths: number[] = Array.from({ length: colCount }, () => 0);
    cardMeta.forEach((m) => {
        colLengths[m.colIndex] = Math.max(
            colLengths[m.colIndex] || 0,
            m.indexInColumn + 1
        );
    });

    const hoveredIndex = hoveredId
        ? cardMeta.findIndex((m) => m.id === hoveredId)
        : -1;
    const hasHoveredCard = hoveredIndex >= 0;
    const hoveredMeta = hasHoveredCard ? cardMeta[hoveredIndex] : null;

    return (
        <Stack
            gap={4}
            style={{
                flex: "0 0 auto",
                height: "100%",
                display: "flex",
                alignItems: "stretch",
                overflow: "hidden",
                opacity: isOpenDelayed ? 1 : 0,
                transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
                maxWidth: colCount * (GRID.cardWidth + GRID.gap * 2) + GRID.gap * 2,
            }}
        >
            <Text
                size="xs"
                c="var(--interlinked-color-primary)"
                title={`${label} (${cards.length})`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 14,
                }}
            >
                {label}
                <Badge
                    ml={4}
                    size="xs"
                    variant="filled"
                    color="var(--interlinked-color-primary)"
                >
                    {cards.length}
                </Badge>
            </Text>

            <Box
                className="subtle-scrollbar"
                p={GRID.gap * 2}
                pr={GRID.gap}
                style={{
                    flex: "1 1 auto",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    overscrollBehaviorY: "contain",
                    boxShadow: isDark
                        ? "inset 0 0 20px rgba(0, 0, 0, 0.5)"
                        : "inset 0 0 20px rgba(0, 0, 0, 0.3)",
                }}
            >
                <Box
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                        position: "relative",
                        width: colCount * (GRID.cardWidth + GRID.gap * 2),
                        height: columnHeight,
                        overflow: "visible",
                    }}
                >
                    {cardMeta.map((cardMeta => {
                        const item = cards[cardMeta.metaIndex];
                        return (
                            <AssociatedDeckCard
                                key={cardMeta.id}
                                meta={cardMeta}
                                item={item}
                                colLengths={colLengths}
                                hoveredMeta={hoveredMeta}
                                hasHoveredCard={hasHoveredCard}
                                currentItemId={currentItemId}
                                onToggleClickBounded={onToggleClickBounded}
                                setHoveredId={setHoveredId}
                            />
                        );
                    }))}
                </Box>
            </Box>
        </Stack>
    );
}
