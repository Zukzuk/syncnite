import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge, Box, Stack, Text } from "@mantine/core";
import { GameItem, NavMode } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedDeckCard } from "./AssociatedDeckCard";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";
import { useLibraryContext } from "../../LibraryContext";

type Props = {
    deckKey: string;
    animateIn?: boolean;
    label: string;
    currentItemId: string;
    items: GameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    onToggleClickBounded: (id?: string, navMode?: NavMode) => void;
};

// Component to display an associated deck of items in the library view.
export function AssociatedDeck({
    deckKey,
    animateIn = true,
    label,
    currentItemId,
    items,
    deckColumns,
    maxCardsPerColumn,
    onToggleClickBounded,
}: Props): JSX.Element | null {
    const lib = useLibraryContext();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);

    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const isOpenDelayed = useDelayedFlag({ active: animateIn, delayMs: 140 });
    const show = animateIn ? isOpenDelayed : true;

    const { isDark, grid } = useInterLinkedTheme();

    const cards = items.filter((g) => g.coverUrl);
    if (cards.length === 0 || deckColumns <= 0) return null;

    // Restore scroll position when (itemId, deckKey) changes.
    // IMPORTANT: don't depend on lib/version here (scroll updates bump version).
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const saved = lib.getDeckScrollTop(currentItemId, deckKey);
        el.scrollTop = typeof saved === "number" ? saved : 0;
    }, [currentItemId, deckKey]);

    // Persist scroll position (rAF throttled).
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            lib.setDeckScrollTop(currentItemId, deckKey, el.scrollTop);
        });
    }, [lib, currentItemId, deckKey]);

    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const colCount = Math.max(1, deckColumns);
    const total = cards.length;

    let cardsPerColumn: number;
    if (maxCardsPerColumn && maxCardsPerColumn > 0) {
        const maxTotalCapacity = colCount * maxCardsPerColumn;
        if (total <= maxTotalCapacity) {
            cardsPerColumn = Math.min(maxCardsPerColumn, Math.ceil(total / colCount));
        } else {
            cardsPerColumn = Math.ceil(total / colCount);
        }
    } else {
        cardsPerColumn = Math.ceil(total / colCount);
    }

    const cardHeight = (grid.cardWidth * 32) / 23;
    const columnHeight =
        cardsPerColumn > 0 ? cardHeight + grid.cardStepY * (cardsPerColumn - 1) : 0;

    const cardMeta = cards.map((c, index) => {
        const colIndex = Math.floor(index / cardsPerColumn);
        const indexInColumn = index % cardsPerColumn;
        return { id: c.id, metaIndex: index, colIndex, indexInColumn };
    });

    const colLengths: number[] = Array.from({ length: colCount }, () => 0);
    cardMeta.forEach((m) => {
        colLengths[m.colIndex] = Math.max(colLengths[m.colIndex] || 0, m.indexInColumn + 1);
    });

    const hoveredIndex = hoveredId ? cardMeta.findIndex((m) => m.id === hoveredId) : -1;
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
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(12px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
                maxWidth: colCount * (grid.cardWidth + grid.gap * 2) + grid.gap * 2,
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
                <Badge ml={4} size="xs" variant="filled" color="var(--interlinked-color-primary)">
                    {cards.length}
                </Badge>
            </Text>

            <Box
                ref={scrollRef}
                onScroll={onScroll}
                className="subtle-scrollbar"
                p={grid.gap * 2}
                pr={grid.gap}
                style={{
                    flex: "1 1 auto",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    overscrollBehaviorY: "contain",
                    boxShadow: isDark ? "inset 0 0 20px rgba(0, 0, 0, 0.5)" : "inset 0 0 20px rgba(0, 0, 0, 0.3)",
                }}
            >
                <Box
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                        position: "relative",
                        width: colCount * (grid.cardWidth + grid.gap * 2),
                        height: columnHeight,
                        overflow: "visible",
                    }}
                >
                    {cardMeta.map((meta) => {
                        const item = cards[meta.metaIndex];
                        return (
                            <AssociatedDeckCard
                                key={meta.id}
                                meta={meta}
                                item={item}
                                colLengths={colLengths}
                                hoveredMeta={hoveredMeta}
                                hasHoveredCard={hasHoveredCard}
                                currentItemId={currentItemId}
                                onToggleClickBounded={onToggleClickBounded}
                                setHoveredId={setHoveredId}
                            />
                        );
                    })}
                </Box>
            </Box>
        </Stack>
    );
}
