import React from "react";
import { Box, Flex, Text, Group } from "@mantine/core";
import { IconPlayerPlay, IconDownload } from "@tabler/icons-react";
import { GRID } from "../lib/constants";
import { Item } from "../features/library/hooks/useLibrary";
import { IconImage } from "./IconImage";
import { ExternalLink } from "./ExternalLink";
import { IconSourceLink } from "./IconSourceLink";
import { CopyTitle } from "./CopyTitle";

type Props = {
    item: Item;
    collapseOpen: boolean;
};

export function RowItem({ item, collapseOpen }: Props) {
    const { id, isInstalled, iconUrl, title, gameId, year, source, tags, series, link, isHidden } = item;
    const [hovered, setHovered] = React.useState(false);

    return (
        <Box
            style={{
                display: "grid",
                alignItems: "center",
                gap: 12,
                height: GRID.rowHeight,
                gridTemplateColumns: GRID.colsList,
            }}
        >
            <Flex align="center" gap={8} style={{ width: GRID.iconSize }}>
                <Box
                    component="a"
                    href={`playnite://play/${id}`}
                    title={title}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
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
                            opacity: hovered ? 0.35 : 1,
                            transition: "opacity 140ms ease",
                        }}
                    >
                        <IconImage src={iconUrl ?? ""} />
                    </Box>

                    <Box
                        style={{
                            position: "relative",
                            display: "flex",
                            color: "var(--mantine-color-grape-4)",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: hovered ? 1 : 0,
                            transform: hovered ? "scale(1)" : "scale(0.96)",
                            transition: "opacity 140ms ease, transform 140ms ease",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
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
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: collapseOpen ? 20 : undefined,
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

            {/* <Box style={{ display: collapseOpen ? "none" : undefined }}>
                <Group gap={6} align="center" wrap="wrap" style={{ maxHeight: GRID.rowHeight, overflow: "hidden" }}>
                    {(tags ?? []).map((t) => (
                        <Badge key={t} variant="dark" size="sm">
                            {t}
                        </Badge>
                    ))}
                </Group>
            </Box> */}
        </Box>
    );
}