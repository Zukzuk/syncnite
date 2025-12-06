import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import {
    ASSOCIATED_CARD_STEP_Y,
    GRID,
    MAX_ASSOCIATED,
} from "../../../lib/constants";
import { AssociatedCardMeta, GameItem } from "../../../types/types";
import { getTheme } from "../../../lib/utils";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";

type Props = {
    label: string;
    currentItemId: string;
    items: GameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    onAssociatedClick: (targetId: string) => void;
};

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
    const { isDark } = getTheme();

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
            // Not enough height → deck scrolls, but we keep logical columns
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
                willChange: "opacity, transform",
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
                        const { colIndex, indexInColumn, id, index } = meta;
                        const item = cards[index];
                        const { title, year, coverUrl } = item;

                        const left = colIndex * (GRID.cardWidth + GRID.gap * 2);
                        const top = indexInColumn * ASSOCIATED_CARD_STEP_Y;

                        let zIndex = indexInColumn + 1;
                        const isTopCard =
                            hasHoveredCard && hoveredMeta!.index === index;
                        const isDimmed =
                            hasHoveredCard && isDeckHovered && !isTopCard;
                        const isCurrentItem = id === currentItemId;

                        if (hasHoveredCard) {
                            if (hoveredMeta!.colIndex === colIndex) {
                                const distance = Math.abs(
                                    hoveredMeta!.indexInColumn - indexInColumn
                                );
                                const maxZInCol = (colLengths[colIndex] || 0) + 1;
                                zIndex = maxZInCol - distance;
                            } else {
                                zIndex = indexInColumn + 1;
                            }
                        }

                        return (
                            <Box
                                key={id}
                                aria-label="associated-card"
                                component="a"
                                title={year ? `${title} (${year})` : title}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAssociatedClick(id);
                                }}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoveredId(id);
                                }}
                                style={{
                                    position: "absolute",
                                    left,
                                    top,
                                    width: GRID.cardWidth,
                                    zIndex,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    backgroundColor: "var(--mantine-color-dark-6)",
                                    boxShadow: isTopCard
                                        ? "0 8px 16px rgba(0, 0, 0, 0.25)"
                                        : "0 4px 8px rgba(0, 0, 0, 0.15)",
                                    border:
                                        isTopCard || isCurrentItem
                                            ? "2px solid var(--mantine-primary-color-4)"
                                            : isDark
                                                ? "2px solid var(--mantine-color-dark-9)"
                                                : "2px solid var(--mantine-color-gray-3)",
                                    transform: isTopCard ? "scale(1.07)" : "scale(1)",
                                    transition:
                                        "transform 140ms ease, box-shadow 140ms ease, clip-path 140ms ease",
                                }}
                            >
                                <Box
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        aspectRatio: "23 / 32",
                                    }}
                                >
                                    <Image
                                        src={coverUrl || ""}
                                        alt={title}
                                        fit="fill"
                                        loading="lazy"
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "fill",
                                        }}
                                    />

                                    {isDimmed && (
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundColor: isDark
                                                    ? "color-mix(in srgb, var(--mantine-color-dark-7) 65%, transparent)"
                                                    : "color-mix(in srgb, var(--mantine-color-gray-3) 50%, transparent)",
                                                transition: "background-color 120ms ease",
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Stack>
    );
}
