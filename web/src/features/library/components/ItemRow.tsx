import React from "react";
import { Box, Flex, Text, Group, Badge } from "@mantine/core";
import { IconPlayerPlay, IconDownload } from "@tabler/icons-react";
import { GameItem } from "../../../types/types";
import { IconGame } from "../../../components/IconGame";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { IconLinkSource } from "../../../components/IconSourceLink";
import { getTheme } from "../../../theme";
import { version } from "os";

type Props = {
    item: GameItem;
    isOpen: boolean;
    isListView: boolean;
};

// Row component for a library item in list view.
export function ItemRow({ item, isOpen, isListView }: Props): JSX.Element | null {
    if (!isOpen && !isListView) return null;

    const { playniteLink, isInstalled, isHidden, iconUrl, title, year, source, series, htmlLink, sourceLink, version } = item;
    const { hasMenu, GRID } = getTheme();
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <Box
            aria-label="item-row"
            style={{
                display: "grid",
                alignItems: "center",
                height: GRID.rowHeight,
                gap: GRID.gap,
                gridTemplateColumns: isOpen ? GRID.colsOpen : GRID.colsList,
            }}
        >
            { /* GAME ICON SECTION */}
            <Flex align="center" gap={GRID.gap} style={{ width: GRID.iconSize }}>
                <Box
                    component="a"
                    href={playniteLink}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => e.stopPropagation()}
                    title={title}
                    style={{
                        position: "relative",
                        width: GRID.iconSize,
                        height: GRID.iconSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                        cursor: "pointer",
                    }}
                >
                    <Box
                        style={{
                            position: "absolute",
                            inset: 0,
                            opacity: isHovered ? 0.2 : 1,
                            transition: "opacity 140ms ease",
                        }}
                    >
                        <IconGame src={iconUrl} />
                    </Box>

                    <Box
                        style={{
                            position: "relative",
                            display: "flex",
                            color: "var(--interlinked-color-primary-soft)",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: isHovered ? 1 : 0,
                            transform: isHovered ? "scale(1)" : "scale(0.96)",
                            transition: "opacity 140ms ease, transform 140ms ease",
                        }}
                    >
                        {isInstalled ? (
                            <IconPlayerPlay size={26} stroke={2} />
                        ) : (
                            <IconDownload size={26} stroke={2} />
                        )}
                    </Box>
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

                    {hasMenu ? (
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