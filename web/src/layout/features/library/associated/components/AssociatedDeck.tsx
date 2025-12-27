import { useMemo, useState } from "react";
import { Badge, Box, Stack, Text } from "@mantine/core";
import { useAssociatedDeckLayout } from "../hooks/useAssociatedDeckLayout";
import { usePersistedScrollTop } from "../hooks/usePersistedScrollTop";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { HistoryNavMode } from "../../../../../types/app";
import { useLibraryContext } from "../../../LibraryContext";
import { useDelayedFlag } from "../../../../hooks/useDelayedFlag";
import { AssociatedDeckCard } from "./AssociatedDeckCard";

type Props = {
    deckKey: string;
    animateIn?: boolean;
    label: string;
    currentItemId: string;
    items: InterLinkedGameItem[];
    deckColumns: number;
    maxCardsPerColumn: number | null;
    isDark: boolean;
    grid: InterLinkedGrid;
    onToggleClickBounded: (id?: string, navMode?: HistoryNavMode) => void;
};

export function AssociatedDeck({
    deckKey,
    animateIn = true,
    label,
    currentItemId,
    items,
    deckColumns,
    maxCardsPerColumn,
    isDark,
    grid,
    onToggleClickBounded,
}: Props): JSX.Element | null {
    const lib = useLibraryContext();

    const isOpenDelayed = useDelayedFlag({ active: animateIn, delayMs: 140 });
    const show = animateIn ? isOpenDelayed : true;

    const { cards, colCount, width, columnHeight, cardMeta, colLengths } =
        useAssociatedDeckLayout({ items, deckColumns, maxCardsPerColumn, grid });

    // nothing to show
    if (cards.length === 0 || deckColumns <= 0) return null;

    // hover behavior local state (fine to keep here)
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const hoveredIndex = useMemo(
        () => (hoveredId ? cardMeta.findIndex((m) => m.id === hoveredId) : -1),
        [hoveredId, cardMeta]
    );
    const hasHoveredCard = hoveredIndex >= 0;
    const hoveredMeta = hasHoveredCard ? cardMeta[hoveredIndex] : null;

    const { scrollRef, onScroll } = usePersistedScrollTop({
        key: `${currentItemId}:${deckKey}`,
        get: () => lib.getDeckScrollTop(currentItemId, deckKey),
        set: (top: number) => lib.setDeckScrollTop(currentItemId, deckKey, top),
    });

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
                maxWidth: width,
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
                    boxShadow: isDark
                        ? "inset 0 0 20px rgba(0, 0, 0, 0.5)"
                        : "inset 0 0 20px rgba(0, 0, 0, 0.3)",
                }}
            >
                <Box
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                        position: "relative",
                        width: width - grid.gap * 2,
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
                                isDark={isDark}
                                grid={grid}
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
