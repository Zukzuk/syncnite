import { Group, Collapse, Box } from "@mantine/core";
import { InterLinkedDynamicGrid, InterLinkedItem, InterLinkedGrid } from "../../types/interlinked";
import { HistoryNavMode } from "../../types/app";
import { AssociatedDeck } from "./components/AssociatedDeck";
import { AssociatedStacks } from "./components/AssociatedStacks";
import { AssociatedDetails } from "./components/AssociatedDetails";
import { useOpenAssociatedDeck } from "./hooks/useOpenAssociatedDeck";
import { useAssociatedLayout } from "./hooks/useAssociatedLayout";
import { useAssociatedData } from "../../hooks/useAssociatedData";

type Props = {
    item: InterLinkedItem;
    isOpen: boolean;
    isDark: boolean;
    grid: InterLinkedGrid;
    dynamicGrid: InterLinkedDynamicGrid;
    itemsAssociated: InterLinkedItem[];
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
        stackCardWidthUsed,
        colsFitAtMaxWidth,
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
                className={needsColumnLayout ? "subtle-scrollbar" : undefined}
                style={{
                    height: "100%",
                    display: "flex",
                    gap: grid.gapMd,
                    overflowX: "hidden",
                    overflowY: needsColumnLayout ? "scroll" : "hidden",
                    overscrollBehaviorY: needsColumnLayout ? "contain" : undefined,
                    flexDirection: needsColumnLayout ? "column" : "row",
                    alignItems: needsColumnLayout ? "stretch" : "flex-start",
                }}
            >
                <AssociatedDetails
                    item={item}
                    grid={grid}
                    isDark={isDark}
                    openDeckKey={openDeckKey}
                    needsColumnLayout={needsColumnLayout}
                    onBadgeClick={setOpenDeckKey}
                    onWallpaperBg={onWallpaperBg}
                />

                {openDeckData?.key && stackCount > 0 && (
                    <Box
                        style={{
                            flex: 1,
                            minWidth: 0,
                            height: "100%",
                            gap: grid.gapMd,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: needsColumnLayout ? "column" : "row",
                            justifyContent: needsColumnLayout ? "flex-start" : "space-between",
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
                                needsColumnLayout={needsColumnLayout}
                                stackCardWidthUsed={stackCardWidthUsed}
                                description={item.description}
                                colsFitAtMaxWidth={colsFitAtMaxWidth}
                                onStackClick={setOpenDeckKey}
                            />
                        )}

                        {item && openDeck && deckColumns > 0 && stackColumns > 0 && (
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
                                needsColumnLayout={needsColumnLayout}
                                onToggleClickBounded={onToggleClickBounded}
                            />
                        )}
                    </Box>
                )}
            </Box>
        </Collapse>
    );
}
