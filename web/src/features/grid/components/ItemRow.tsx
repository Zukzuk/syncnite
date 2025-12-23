import { useState } from "react";
import { Box, Flex, Text, Group, Badge } from "@mantine/core";
import { IconGame } from "../../../components/IconGame";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { IconLinkSource } from "../../../components/IconSourceLink";
import { IconExecuteOverlay } from "../../../components/IconExecuteOverlay";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../types/interlinked";

type Props = {
    item: InterLinkedGameItem;
    isOpen: boolean;
    grid: InterLinkedGrid;
    hasNavbar: boolean;
    isListView: boolean;
};

// Row component for a library item in list view.
export function ItemRow({ item, isOpen, grid, hasNavbar, isListView }: Props): JSX.Element | null {
    if (!isOpen && !isListView) return null;

    const { playniteLink, isInstalled, isHidden, iconUrl, title, year, source, series, htmlLink, sourceLink, version } = item;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Box
            aria-label="item-row"
            style={{
                display: "grid",
                alignItems: "center",
                height: grid.rowHeight,
                gap: grid.gap,
                gridTemplateColumns: isOpen ? grid.colsOpen : grid.colsList,
            }}
        >
            { /* GAME ICON SECTION */}
            <Flex align="center" gap={grid.gap} style={{ width: grid.iconSize }}>
                <Box
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: "relative",
                        width: grid.iconSize,
                        height: grid.iconSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <IconGame src={iconUrl} />
                    <IconExecuteOverlay
                        title={title}
                        w={grid.iconSize}
                        h={grid.iconSize}
                        isInstalled={isInstalled}
                        isParentHovered={isHovered}
                        link={playniteLink}
                    />
                </Box>
            </Flex>

            { /* TITLE SECTION */}
            <Flex gap={8} align="center" style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="item-title"
                    style={{
                        flex: "0 1 auto",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        transition: "font-size 140ms ease",
                    }}
                >
                    {title}
                </Text>

                {version ? (
                    <Badge
                        size="sm"
                        variant="filled"
                        color="var(--interlinked-color-primary)"
                    >
                        {version}
                    </Badge>
                ) : null}

                <Group
                    gap={4}
                    style={{
                        marginLeft: "auto",
                        flexShrink: 0,
                        alignItems: "center",
                    }}
                >
                    {isOpen && year ? (
                        <Box ta="center"><Text style={{ fontSize: 14, display: "inline" }}>{year}</Text></Box>
                    ) : null}
                    <IconIsInstalled isListView={true} isInstalled={isInstalled} />
                    <IconIsHidden isListView={true} isHidden={isHidden} />
                    <IconCopyTitle title={title} year={year} />
                </Group>
            </Flex>

            {!isOpen ? (
                <>
                    {year && (
                        <Box ta="center"><Text style={{ fontSize: 14, display: "inline" }}>{year}</Text></Box>
                    )}

                    <Box>
                        <Group gap={4} wrap="nowrap" style={{ justifyContent: "center" }}>
                            <IconLinkExternal source={source} htmlLink={htmlLink} title={title} />
                            <IconLinkSource source={source} sourceLink={sourceLink} />
                        </Group>
                    </Box>

                    {hasNavbar ? (
                        <Flex gap={8} style={{ minWidth: 0 }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                                title={series?.join(", ")}
                            >
                                {series && series.length > 0 ? series.join(", ") : ""}
                            </Text>
                        </Flex>
                    ) : null}
                </>
            ) : null}
        </Box>
    );
}