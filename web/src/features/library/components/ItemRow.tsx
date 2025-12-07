import React from "react";
import { Box, Flex, Text, Group } from "@mantine/core";
import { IconPlayerPlay, IconDownload } from "@tabler/icons-react";
import { GRID } from "../../../lib/constants";
import { GameItem } from "../../../types/types";
import { IconGame } from "../../../components/IconGame";
import { IconIsInstalled } from "../../../components/IconIsInstalled";
import { IconIsHidden } from "../../../components/IconIsHidden";
import { IconCopyTitle } from "../../../components/IconCopyTitle";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { IconLinkSource } from "../../../components/IconSourceLink";

type Props = {
    item: GameItem;
    isOpen: boolean;
};

// Row component for a library item in list view.
export function ItemRow({ item, isOpen }: Props): JSX.Element {
    const { id, isInstalled, isHidden, iconUrl, title, gameId, year, source, series, link } = item;
    const [isHovered, setIsHovered] = React.useState(false);
    const playniteUrl = `playnite://playnite/${isInstalled ? "start" : "showgame"}/${id}`;

    return (
        <Box
            style={{
                display: "grid",
                alignItems: "center",
                height: GRID.rowHeight,
                gap: GRID.gap,
                gridTemplateColumns: GRID.colsList,
            }}
        >
            <Flex align="center" gap={GRID.gap} style={{ width: GRID.iconSize }}>
                <Box
                    component="a"
                    href={playniteUrl}
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

            <Flex gap={8} align="center" style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="item-title"
                    style={{
                        flex: 1, // let title take remaining space
                        minWidth: 0, // allow shrinking for ellipsis
                        overflow: isOpen ? undefined : "hidden",
                        textOverflow: isOpen ? undefined : "ellipsis",
                        whiteSpace: isOpen ? undefined : "nowrap",
                        transition: "font-size 140ms ease",
                    }}
                >
                    {title}
                </Text>

                {/* push utility icons to the far right */}
                <Group
                    gap={4}
                    style={{
                        marginLeft: "auto",
                        flexShrink: 0,
                        alignItems: "center",
                    }}
                >
                    <IconIsInstalled isListView={true} isInstalled={isInstalled} />
                    <IconIsHidden isListView={true} isHidden={isHidden} />
                    <IconCopyTitle title={title} year={year} />
                </Group>
            </Flex>

            <Box ta="center">
                {year && (
                    <Text style={{ fontSize: 14 }}>{year}</Text>
                )}
            </Box>

            <Box>
                <Group gap={4} wrap="nowrap" style={{ justifyContent: "center" }}>
                    <IconLinkExternal source={source} link={link} title={title} />
                    <IconLinkSource source={source} gameId={gameId} link={link} />
                </Group>
            </Box>

            <Flex gap={8} style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="game-series"
                    style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {series && series.length > 0 ? series.join(", ") : ""}
                </Text>
            </Flex>
        </Box>
    );
}