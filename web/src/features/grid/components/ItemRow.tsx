import { useState } from "react";
import { Box, Flex, Text, Group, Badge } from "@mantine/core";
import { InterLinkedItem, InterLinkedGrid } from "../../../types/interlinked";
import { IconExecuteOverlay } from "../../../components/IconExecuteOverlay";
import { IconGame } from "../../../components/IconGame";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkOrigin } from "../../../components/IconOriginLink";
import { IconLinkSource } from "../../../components/IconSourceLink";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { isGame } from "../../../utils";

type Props = {
    item: InterLinkedItem;
    isOpen: boolean;
    grid: InterLinkedGrid;
    hasNavbar: boolean;
    isListView: boolean;
    isWidescreen: boolean;
    isDesktop: boolean;
};

// Row component for a library item in list view.
export function ItemRow({ item, isOpen, grid, hasNavbar, isListView, isWidescreen, isDesktop }: Props): JSX.Element | null {
    if (!isOpen && !isListView) return null;

    const { originLink, isHidden, iconUrl, year, titleWithoutVersion,
        title, series, htmlLink, version, origin, originRunLink, id } = item;
    const { source, sourceLink, isInstalled } = isGame(item) ? item : { source: null, sourceLink: null, isInstalled: false };
    
    const [isHovered, setIsHovered] = useState(false);
    const cols = isOpen
        ? "40px minmax(0, 1fr) 56px"
        : `40px minmax(0, 1fr) 60px 80px ${isWidescreen ? "300px" : isDesktop ? "150px" : "0px"}`;

    return (
        <Box
            aria-label="item-row"
            style={{
                display: "grid",
                alignItems: "center",
                height: grid.rowHeight,
                gap: grid.gap,
                gridTemplateColumns: cols,
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
                        showOverlay={isHovered}
                        link={originLink}
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
                    {titleWithoutVersion}
                </Text>

                {version ? (
                    <Badge
                        size="xs"
                        variant="outline"
                        color="var(--interlinked-color-primary)"
                        style={{ display: "inline-block" }}
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
                        <Group gap={2} wrap="nowrap" style={{ justifyContent: "center" }}>
                            <IconLinkOrigin origin={origin} originRunLink={originRunLink} id={id} />
                            {origin !== source && <IconLinkSource source={source} sourceLink={sourceLink} />}
                            <IconLinkExternal htmlLink={htmlLink} title={title} />
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