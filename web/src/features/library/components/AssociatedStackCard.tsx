import React from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { GRID } from "../../../lib/constants";
import { AssociatedItems } from "../../../types/types";
import { getTheme } from "../../../theme";

type Props = {
    stack: AssociatedItems;
    isOpen: boolean;
    onStackClick: (key: string) => void;
};

// Card component for an associated stack of decks in the library view.
export function AssociatedStackCard({ stack, isOpen, onStackClick }: Props): JSX.Element | null {
    const { label, items, key } = stack;
    const [isHovered, setIsHovered] = React.useState(false);
    const { isDark } = getTheme();

    if (!items.length) return null;

    const numberOfItems = items.length;
    const cards = items.filter((g) => g.coverUrl);
    const previewSlots = Array.from(
        { length: 4 },
        (_, i) => cards.slice(0, 4)[i] ?? null
    );

    const isHoveredOrOpen = isHovered || isOpen;

    return (
        <Stack
            aria-label="associated-stack"
            gap={4}
            bg="var(--mantine-color-body)"
            style={{
                flex: "0 0 auto",
                width: GRID.cardWidth * 0.7,
                borderRadius: 4,
            }}
        >
            <Box
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onStackClick(key);
                }}
                style={{
                    padding: GRID.gap,
                    borderRadius: 4,
                    border: isHoveredOrOpen
                        ? "2px solid var(--interlinked-color-primary-soft)"
                        : isDark
                            ? "2px solid var(--mantine-color-dark-9)"
                            : "2px solid var(--mantine-color-gray-3)",
                    backgroundColor: isOpen
                        ? "var(--interlinked-color-primary-translucent)"
                        : "var(--mantine-color-body)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: GRID.gap,
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                }}
            >
                <Text
                    size="xs"
                    c={isOpen ? "var(--interlinked-color-primary-soft)" : "dimmed"}
                    title={label}
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Text>

                <Box
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 4,
                    }}
                >
                    {previewSlots.map((g, idx) => (
                        <Box
                            key={g ? g.id : `placeholder-${idx}`}
                            style={{
                                width: "100%",
                                aspectRatio: "23 / 32",
                                borderRadius: 4,
                                overflow: "hidden",
                                boxShadow: g
                                    ? "0 2px 4px rgba(0, 0, 0, 0.25)"
                                    : "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
                                backgroundColor: "transparent",
                            }}
                        >
                            {g && (
                                <Image
                                    src={g.coverUrl || ""}
                                    alt={g.title}
                                    fit="fill"
                                    loading="lazy"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "fill",
                                    }}
                                />
                            )}
                        </Box>
                    ))}
                </Box>

                <Text
                    size="xs"
                    c={isOpen ? "var(--interlinked-color-primary-soft)" : "dimmed"}
                >
                    {numberOfItems ? `${numberOfItems} game${numberOfItems !== 1 ? "s" : ""}` : "No games"}
                </Text>
            </Box>
        </Stack>
    );
}