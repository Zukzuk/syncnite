import { useMemo } from "react";
import { Group, Collapse, Box } from "@mantine/core";
import { AssociatedDeck } from "./components/AssociatedDeck";
import { AssociatedStacks } from "./components/AssociatedStacks";
import { AssociatedDetails } from "./components/AssociatedDetails";
import { useOpenAssociatedDeck } from "./hooks/useOpenAssociatedDeck";
import { useAssociatedLayout } from "./hooks/useAssociatedLayout";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../types/interlinked";
import { HistoryNavMode } from "../../../../types/app";
import { useAssociatedData } from "../../../hooks/useAssociatedData";

type Props = {
    item: InterLinkedGameItem;
    isOpen: boolean;
    grid: InterLinkedGrid;
    isDark: boolean;
    cssOpenWidth: string;
    cssOpenHeight: string;
    itemsAssociated: InterLinkedGameItem[];
    onWallpaperBg: (on: boolean) => void;
    onToggleClickBounded: (id?: string, navMode?: HistoryNavMode) => void;
};

// Content component for an expanded library item, showing associated decks and stacks.
export function AssociatedContent({
    item,
    isOpen,
    grid,
    isDark,
    cssOpenWidth,
    cssOpenHeight,
    itemsAssociated,
    onWallpaperBg,
    onToggleClickBounded,
}: Props): JSX.Element | null {
    if (!isOpen) return null;

    const { associatedData } = useAssociatedData(isOpen, item, itemsAssociated);

    const { openDeck, openDeckKey, setOpenDeckKey } = useOpenAssociatedDeck({
        itemId: item.id,
        associatedData,
    });

    const gapRight = useMemo(() => grid.gap * 7, [grid.gap]);

    const { layoutRef, layout } = useAssociatedLayout({
        grid,
        openDeck: openDeck ? { key: openDeck.key, items: openDeck.items } : null,
        gapRight,
    });

    const stackColumns = Math.max(layout.stackColumns, layout.minStackColumns);

    return (
        <Collapse
            aria-label="item-content"
            in={isOpen}
            transitionDuration={140}
            py={grid.gap}
            pr={gapRight}
            style={{
                width: cssOpenWidth,
                height: `calc(${cssOpenHeight} - ${grid.rowHeight}px)`,
                backgroundColor: "transparent",
                overflowX: "hidden",
                overflowY: "hidden",
            }}
        >
            <Group align="flex-start" gap={grid.gap * 3} wrap="nowrap" h="100%">
                <AssociatedDetails
                    item={item}
                    grid={grid}
                    isDark={isDark}
                    openDeckKey={openDeckKey}
                    onBadgeClick={setOpenDeckKey}
                    onWallpaperBg={onWallpaperBg}
                />

                <Box
                    ref={layoutRef}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        display: "flex",
                        gap: grid.gap * 3,
                        overflow: "hidden",
                    }}
                >
                    {openDeck && layout.deckColumns > 0 && (
                        <AssociatedDeck
                            deckKey={openDeck.key}
                            label={openDeck.label}
                            items={openDeck.items}
                            currentItemId={item.id}
                            deckColumns={layout.deckColumns}
                            maxCardsPerColumn={layout.maxCardsPerDeckColumn}
                            isDark={isDark}
                            grid={grid}
                            onToggleClickBounded={onToggleClickBounded}
                        />
                    )}

                    {associatedData.length > 0 && (
                        <AssociatedStacks
                            currentItemId={item.id}
                            associatedData={associatedData}
                            openDeckKey={openDeckKey}
                            stackColumns={stackColumns} 
                            isDark={isDark}
                            grid={grid}
                            onStackClick={setOpenDeckKey}
                        />
                    )}
                </Box>
            </Group>
        </Collapse>
    );
}
