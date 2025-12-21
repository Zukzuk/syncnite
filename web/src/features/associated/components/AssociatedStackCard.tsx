import { useState } from "react";
import { Box, Image, Stack, Text } from "@mantine/core";
import { AssociatedItems } from "../../../types/types";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";

type Props = {
    stack: AssociatedItems;
    isOpen: boolean;
    onStackClick: (key: string) => void;
};

// Card component for an associated stack of decks in the library view.
export function AssociatedStackCard({ stack, isOpen, onStackClick }: Props): JSX.Element | null {
    const { label, items, key } = stack;
    if (!items.length) return null;
    
    const [isHovered, setIsHovered] = useState(false);
    const { isDark, grid } = useInterLinkedTheme();

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
                width: grid.cardWidth * 0.7,
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
                    padding: grid.gap,
                    borderRadius: 4,
                    border: isHoveredOrOpen
                        ? "2px solid var(--interlinked-color-primary-softer)"
                        : isDark
                            ? "2px solid var(--mantine-color-dark-8)"
                            : "2px solid var(--mantine-color-gray-3)",
                    backgroundColor: isHoveredOrOpen
                        ? "var(--interlinked-color-primary-softer)"
                        : "var(--mantine-color-body)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: grid.gap,
                    boxShadow: "0 0px 8px rgba(0, 0, 0, 0.15)",
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
                                aspectRatio: grid.ratio,
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