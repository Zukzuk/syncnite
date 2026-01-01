import { Group, Collapse, Box } from "@mantine/core";
import { InterLinkedDynamicGrid, InterLinkedGameItem, InterLinkedGrid } from "../../types/interlinked";
import { HistoryNavMode } from "../../types/app";
import { AssociatedDeck } from "./components/AssociatedDeck";
import { AssociatedStacks } from "./components/AssociatedStacks";
import { AssociatedDetails } from "./components/AssociatedDetails";
import { useOpenAssociatedDeck } from "./hooks/useOpenAssociatedDeck";
import { useAssociatedLayout } from "./hooks/useAssociatedLayout";
import { useAssociatedData } from "../../hooks/useAssociatedData";

type Props = {
    item: InterLinkedGameItem;
    isOpen: boolean;
    isDark: boolean;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
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
    dynamicGrid,
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

    const openDeckData = openDeck ? { key: openDeck.key, items: openDeck.items } : null;
    const stackCount = associatedData.length;

    const {
        deckColumns,
        stackColumns,
        maxCardsPerDeckColumn,
        needsColumnLayout,
        stacksWidth,
        stackCardWidthUsed,
    } = useAssociatedLayout({
        grid,
        dynamicGrid,
        openDeckData,
        stackCount,
    });

    return (
        <Collapse
            aria-label="item-content"
            in={isOpen}
            transitionDuration={140}
            py={grid.gap}
            pr={grid.gapLg}
            style={{
                width: dynamicGrid.gridViewportW,
                height: dynamicGrid.gridViewportH - grid.rowHeight,
                backgroundColor: "transparent",
                overflowX: "hidden",
                overflowY: "hidden",
            }}
        >
            <Box
                style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: needsColumnLayout ? "column" : "row",
                    alignItems: needsColumnLayout ? "stretch" : "flex-start",
                    gap: grid.gapMd,
                    overflow: "hidden",
                }}
            >
                <AssociatedDetails
                    item={item}
                    grid={grid}
                    isDark={isDark}
                    openDeckKey={openDeckKey}
                    onBadgeClick={setOpenDeckKey}
                    onWallpaperBg={onWallpaperBg}
                />

                {openDeckData?.key && stackCount > 0 && (
                    <Box
                        style={{
                            flex: 1,
                            minWidth: 0,
                            height: "100%",
                            display: "flex",
                            flexDirection: needsColumnLayout ? "column" : "row",
                            justifyContent: needsColumnLayout ? "flex-start" : "space-between",
                            gap: grid.gapMd,
                            overflow: "hidden",
                        }}
                    >
                        {deckColumns > 0 && stackColumns > 0 && (
                            <AssociatedStacks
                                associatedData={associatedData}
                                openDeckKey={openDeckKey}
                                stackColumns={stackColumns}
                                isDark={isDark}
                                grid={grid}
                                dynamicGrid={dynamicGrid}
                                onStackClick={setOpenDeckKey}
                                stacksWidth={stacksWidth}
                                stackCardWidthUsed={stackCardWidthUsed}
                            />
                        )}

                        {openDeck && deckColumns > 0 && stackColumns > 0 && (
                            <AssociatedDeck
                                deckKey={openDeck.key}
                                label={openDeck.label}
                                items={openDeck.items}
                                currentItemId={item.id}
                                deckColumns={deckColumns}
                                maxCardsPerColumn={maxCardsPerDeckColumn}
                                isDark={isDark}
                                grid={grid}
                                dynamicGrid={dynamicGrid}
                                onToggleClickBounded={onToggleClickBounded}
                            />
                        )}
                    </Box>
                )}
            </Box>
        </Collapse>
    );
}
