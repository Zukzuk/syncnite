import React from "react";
import { Box, Flex, Text, Group } from "@mantine/core";
import { IconPlayerPlay, IconDownload } from "@tabler/icons-react";
import { GRID } from "../../../lib/constants";
import { IconImage } from "../../../components/IconImage";
import { ExternalLink } from "../../../components/ExternalLink";
import { IconSourceLink } from "../../../components/IconSourceLink";
import { CopyTitle } from "../../../components/CopyTitle";
import { GameItem } from "../../../types/types";

type Props = {
    item: GameItem;
    isOpen: boolean;
};

export function ItemRow({ item, isOpen }: Props): JSX.Element {
    const { id, isInstalled, iconUrl, title, gameId, year, source, series, link } = item;
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
                        <IconImage src={iconUrl ?? ""} />
                    </Box>

                    <Box
                        style={{
                            position: "relative",
                            display: "flex",
                            color: "var(--mantine-primary-color-4)",
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

            <Flex gap={8} style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="item-title"
                    style={{
                        overflow: isOpen ? undefined : "hidden",
                        textOverflow: isOpen ? undefined : "ellipsis",
                        whiteSpace: isOpen ? undefined : "nowrap",
                        transition: "font-size 140ms ease",
                    }}
                >
                    {title}
                </Text>

                {/* push utility icons to the far right */}
                <Box style={{ marginLeft: "auto" }}>
                    <CopyTitle title={title} year={year} />
                </Box>
            </Flex>

            <Box ta="center">
                {year && (
                    <Text style={{ fontSize: 14 }}>{year}</Text>
                )}
            </Box>

            <Box>
                <Group gap={6} wrap="nowrap" style={{ justifyContent: "center" }}>
                    <ExternalLink source={source} link={link} title={title} />
                    <IconSourceLink source={source} gameId={gameId} link={link} />
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