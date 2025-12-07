import React from "react";
import { Box, Stack, Text } from "@mantine/core";
import { ASSOCIATED_CARD_STEP_Y, GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { AssociatedCardMeta, GameItem } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedDeckCard } from "./AssociatedDeckCard";

type Props = {
    label: string;
    currentItemId: string;
    items: GameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    onAssociatedClick: (targetId: string) => void;
};

// Component to display an associated deck of items in the library view.
export function AssociatedDeck({
    label,
    currentItemId,
    items,
    onAssociatedClick,
    deckColumns,
    maxCardsPerColumn,
}: Props): JSX.Element | null {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [isDeckHovered, setIsDeckHovered] = React.useState(false);
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 140 });
    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
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
            ? cardHeight + ASSOCIATED_CARD_STEP_Y * (cardsPerColumn - 1)
            : 0;

    const cardMeta: AssociatedCardMeta[] = cards.map((c, index) => {
        const colIndex = Math.floor(index / cardsPerColumn);
        const indexInColumn = index % cardsPerColumn;
        return { id: c.id, index, colIndex, indexInColumn };
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
                maxWidth: colCount * (GRID.cardWidth + GRID.gap * 2) + GRID.gap,
            }}
        >
            <Text
                size="xs"
                style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </Text>

            <Box
                className="subtle-scrollbar"
                p={GRID.gap}
                style={{
                    flex: "1 1 auto",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    overscrollBehaviorY: "contain",
                }}
            >
                <Box
                    onMouseEnter={() => setIsDeckHovered(true)}
                    onMouseLeave={() => {
                        setIsDeckHovered(false);
                        setHoveredId(null);
                    }}
                    style={{
                        position: "relative",
                        width: colCount * (GRID.cardWidth + GRID.gap * 2),
                        height: columnHeight,
                        overflow: "visible",
                    }}
                >
                    {cardMeta.map((meta) => {
                        const item = cards[meta.index];
                        return (
                            <AssociatedDeckCard
                                key={meta.id}
                                meta={meta}
                                item={item}
                                colLengths={colLengths}
                                hoveredMeta={hoveredMeta}
                                hasHoveredCard={hasHoveredCard}
                                isDeckHovered={isDeckHovered}
                                currentItemId={currentItemId}
                                onAssociatedClick={onAssociatedClick}
                                setHoveredId={setHoveredId}
                            />
                        );
                    })}
                </Box>
            </Box>
        </Stack>
    );
}
