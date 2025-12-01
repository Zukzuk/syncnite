import React from "react";
import { Box, Flex, Image, Text } from "@mantine/core";
import { ASSOCIATED_CARD_STEP_Y, GRID, MAX_ASSOCIATED } from "../../../lib/constants";
import { GameItem } from "../../../types/types";

type Props = {
    label: string;
    items: GameItem[];
    onAssociatedClick: (targetId: string) => void;
};

export function ItemAssociatedCards({ label, items, onAssociatedClick }: Props): JSX.Element | null {
    const cards = items.filter((g) => g.coverUrl).slice(0, MAX_ASSOCIATED);
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);

    if (cards.length === 0) return null;

    const cardHeight = (GRID.coverWidth * 32) / 23;
    const deckHeight = cardHeight + ASSOCIATED_CARD_STEP_Y * (cards.length - 1);

    const hoveredIndex = hoveredId
        ? cards.findIndex((c) => c.id === hoveredId)
        : -1;

    const maxZ = cards.length * 2;

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const deltaY = event.deltaY;
        const noScroll = scrollHeight <= clientHeight + 1;

        // If there's no scrollable content, always block scroll chaining
        if (noScroll) {
            event.preventDefault();
            return;
        }

        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        const scrollingUp = deltaY < 0;
        const scrollingDown = deltaY > 0;

        // At bounds + trying to scroll further -> lock
        if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
            event.preventDefault();
        }
    };

    return (
        <Flex direction="column" align="flex-start" gap="xs">
            <Text size="xs" c="dimmed">
                {label}
            </Text>
            <Box
                className="subtle-scrollbar"
                onWheel={handleWheel}
                style={{
                    flex: "0 0 auto",
                    maxHeight: "100%",
                    overflowY: "auto",
                    overflowX: "visible",
                    overscrollBehaviorY: "contain",
                }}
            >
                <Box
                    style={{
                        position: "relative",
                        width: GRID.cardWidth,
                        height: deckHeight,
                        overflow: "visible",
                    }}
                >
                    {cards.map((g, index) => {
                        const isHovered = hoveredId === g.id;
                        const top = index * ASSOCIATED_CARD_STEP_Y;

                        // Pyramid z-index around hovered card
                        let zIndex: number;
                        if (hoveredIndex === -1) {
                            // No hovered card: default stack
                            zIndex = maxZ - index;
                        } else {
                            const distance = Math.abs(index - hoveredIndex);
                            zIndex = maxZ - distance;
                        }

                        return (
                            <Box
                                key={g.id}
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
                                    left: 0,
                                    top,
                                    width: GRID.cardWidth,
                                    zIndex,
                                    cursor: "pointer",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    boxShadow: isHovered
                                        ? "0 16px 24px rgba(0,0,0,1)"
                                        : "0 4px 16px rgba(0,0,0,0.5)",
                                    transition:
                                        "transform 140ms ease, box-shadow 140ms ease",
                                    backgroundColor: "var(--mantine-color-dark-6)",
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
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Flex>
    );
}


