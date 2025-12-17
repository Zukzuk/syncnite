import { Box, Image } from "@mantine/core";
import { GRID } from "../../../lib/constants";
import { AssociatedItemCard, GameItem } from "../../../types/types";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { getTheme } from "../../../theme";

type Props = {
    meta: AssociatedItemCard;
    item: GameItem;
    colLengths: number[];
    hoveredMeta: AssociatedItemCard | null;
    hasHoveredCard: boolean;
    currentItemId: string;
    onToggleClickBounded: (id?: string) => void;
    setHoveredId: (id: string | null) => void;
};

// Card component for an associated deck in the library view.       
export function AssociatedDeckCard({
    meta,
    item,
    colLengths,
    hoveredMeta,
    hasHoveredCard,
    currentItemId,
    onToggleClickBounded,
    setHoveredId,
}: Props) {
    const { isDark } = getTheme();
    const { colIndex, indexInColumn, id, metaIndex } = meta;
    const { title, year, coverUrl, isInstalled, isHidden } = item;

    const left = colIndex * (GRID.cardWidth + GRID.gap * 2);
    const top = indexInColumn * GRID.card_step_y;

    let zIndex = indexInColumn + 1;
    const isTopCard = hasHoveredCard && hoveredMeta!.metaIndex === metaIndex;
    const isCurrentItem = id === currentItemId;

    if (hasHoveredCard) {
        if (hoveredMeta!.colIndex === colIndex) {
            const distance = Math.abs(hoveredMeta!.indexInColumn - indexInColumn);
            const maxZInCol = (colLengths[colIndex] || 0) + 1;
            zIndex = maxZInCol - distance;
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
                if (!isCurrentItem) onToggleClickBounded(id);
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
                    ? "0 0px 30px rgba(0, 0, 0, 1)"
                    : "0 0px 8px rgba(0, 0, 0, 0.15)",
                border:
                    isTopCard || isCurrentItem
                        ? "2px solid var(--interlinked-color-primary-soft)"
                        : isDark
                            ? "2px solid var(--mantine-color-dark-8)"
                            : "2px solid var(--mantine-color-gray-3)",
                transform: isTopCard ? "scale(1.07)" : "scale(1)",
                transition:
                    "transform 140ms ease, box-shadow 140ms ease",
            }}
        >
            <Box
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "23 / 32",
                }}
            >
                <IconIsInstalled
                    isListView={false}
                    isInstalled={isInstalled}
                />

                <IconIsHidden
                    isListView={false}
                    isHidden={isHidden}
                />
                
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
            </Box>
        </Box>
    );
}