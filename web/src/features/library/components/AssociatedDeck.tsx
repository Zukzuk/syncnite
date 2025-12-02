import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { ASSOCIATED_CARD_STEP_Y, GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { getTheme } from "../../../lib/utils";

type Props = {
    label: string;
    items: GameItem[];
    onAssociatedClick: (targetId: string) => void;
};

export function AssociatedDeck({
    label,
    items,
    onAssociatedClick,
}: Props): JSX.Element | null {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [isDeckHovered, setIsDeckHovered] = React.useState(false);
    const { isDark } = getTheme();

    // Filter to items with cover images and limit to MAX_ASSOCIATED
    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    if (cards.length === 0) return null;

    // Decide how to split cards into two columns
    let leftCount: number;
    if (cards.length <= 5) leftCount = cards.length;
    else leftCount = Math.ceil(cards.length / 2);

    const rightCount = cards.length - leftCount;
    const cardHeight = (GRID.cardWidth * 32) / 23;
    const leftHeight = leftCount > 0 ? cardHeight + ASSOCIATED_CARD_STEP_Y * (leftCount - 1) : 0;
    const rightHeight = rightCount > 0 ? cardHeight + ASSOCIATED_CARD_STEP_Y * (rightCount - 1) : 0;
    const deckHeight = Math.max(leftHeight, rightHeight);
    const colWidth = GRID.cardWidth;
    const colGap = GRID.gap * 2;
    const hasRightColumn = rightCount > 0;
    const deckWidth = hasRightColumn ? colWidth * 2 + colGap : colWidth;

    const hoveredIndex = hoveredId ? cards.findIndex((c) => c.id === hoveredId) : -1;
    const hasHoveredCard = hoveredIndex >= 0;
    const topIndex = hasHoveredCard ? hoveredIndex : -1;
    const hoveredInLeftColumn = hasHoveredCard && hoveredIndex < leftCount;
    const hoveredIndexInColumn = !hasHoveredCard
        ? -1
        : hoveredInLeftColumn
            ? hoveredIndex
            : hoveredIndex - leftCount;

    return (
        <Stack
            gap={4}
            style={{
                flex: "0 0 auto",
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
                    maxHeight: `calc(100% - ${GRID.gap * 3}px)`,
                    overflowY: "auto",
                    overflowX: "visible",
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
                        width: deckWidth,
                        height: deckHeight,
                        overflow: "visible",
                    }}
                >
                    {cards.map((g, index) => {
                        // Decide column + vertical offset for this card
                        const inLeftColumn = index < leftCount;
                        const indexInColumn = inLeftColumn
                            ? index
                            : index - leftCount;

                        const left = inLeftColumn ? 0 : colWidth + colGap;
                        const top = indexInColumn * ASSOCIATED_CARD_STEP_Y;

                        const maxZInColumn = (inLeftColumn ? leftCount : rightCount) + 1;

                        let zIndex: number;
                        if (!hasHoveredCard) {
                            // Simple stacking inside each column when nothing is hovered
                            zIndex = indexInColumn + 1;
                        } else if (
                            // Same column as hovered -> build a pyramid in this column
                            (inLeftColumn && hoveredInLeftColumn) ||
                            (!inLeftColumn && !hoveredInLeftColumn)
                        ) {
                            const distance = Math.abs(indexInColumn - hoveredIndexInColumn);
                            zIndex = maxZInColumn - distance;
                        } else {
                            // Other column: keep its own natural stacking
                            zIndex = indexInColumn + 1;
                        }

                        const isTopCard = hasHoveredCard && index === topIndex;
                        const isDimmed =
                            hasHoveredCard && isDeckHovered && !isTopCard;

                        return (
                            <Box
                                key={g.id}
                                aria-label="item-associated-card"
                                component="a"
                                title={`${g.title}${g.year ? ` (${g.year})` : ""}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAssociatedClick(g.id);
                                }}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoveredId(g.id);
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
                                    border: isTopCard
                                        ? "2px solid var(--mantine-primary-color-4)"
                                        : isDark
                                            ? "2px solid var(--mantine-color-dark-9)"
                                            : "2px solid var(--mantine-color-gray-3)",
                                    transform: isTopCard ? "scale(1.07)" : "scale(1)",
                                    transition: "transform 140ms ease, box-shadow 140ms ease, clip-path 140ms ease",
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
                                        src={g.coverUrl || ""}
                                        alt={g.title}
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
                                                transition:
                                                    "background-color 120ms ease",
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
