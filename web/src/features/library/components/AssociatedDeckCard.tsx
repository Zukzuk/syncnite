import { Box, Image } from "@mantine/core";
import { GRID, ASSOCIATED_CARD_STEP_Y } from "../../../lib/constants";
import { getTheme } from "../../../lib/utils";
import { AssociatedCardMeta, GameItem } from "../../../types/types";

type Props = {
    meta: AssociatedCardMeta;
    item: GameItem;
    colLengths: number[];
    hoveredMeta: AssociatedCardMeta | null;
    hasHoveredCard: boolean;
    isDeckHovered: boolean;
    currentItemId: string;
    onAssociatedClick: (targetId: string) => void;
    setHoveredId: (id: string | null) => void;
};

export function AssociatedDeckCard({
    meta,
    item,
    colLengths,
    hoveredMeta,
    hasHoveredCard,
    isDeckHovered,
    currentItemId,
    onAssociatedClick,
    setHoveredId,
}: Props) {
    const { isDark } = getTheme();
    const { colIndex, indexInColumn, id, index } = meta;
    const { title, year, coverUrl } = item;

    const left = colIndex * (GRID.cardWidth + GRID.gap * 2);
    const top = indexInColumn * ASSOCIATED_CARD_STEP_Y;

    let zIndex = indexInColumn + 1;
    const isTopCard = hasHoveredCard && hoveredMeta!.index === index;
    const isDimmed = hasHoveredCard && isDeckHovered && !isTopCard;
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
                onAssociatedClick(id);
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
                    ? "0 8px 16px rgba(0, 0, 0, 0.25)"
                    : "0 4px 8px rgba(0, 0, 0, 0.15)",
                border:
                    isTopCard || isCurrentItem
                        ? "2px solid var(--mantine-primary-color-4)"
                        : isDark
                            ? "2px solid var(--mantine-color-dark-9)"
                            : "2px solid var(--mantine-color-gray-3)",
                transform: isTopCard ? "scale(1.07)" : "scale(1)",
                transition:
                    "transform 140ms ease, box-shadow 140ms ease, clip-path 140ms ease",
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

                {isDimmed && (
                    <Box
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: isDark
                                ? "color-mix(in srgb, var(--mantine-color-dark-7) 65%, transparent)"
                                : "color-mix(in srgb, var(--mantine-color-gray-3) 50%, transparent)",
                            transition: "background-color 120ms ease",
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}