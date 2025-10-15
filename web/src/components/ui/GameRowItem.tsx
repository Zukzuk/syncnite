import React, { useState } from "react";
import { Box, Flex, Text, Group, Badge, Tooltip, ActionIcon } from "@mantine/core";
import { PlayActionOverlay } from "./PlayActionOverlay";
import { IconImage } from "./IconImage";
import { GRID } from "../../lib/constants";
import { SourceBadge } from "./SourceBadge";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import { Row } from "../hooks/useLibrary";

type Props = Row & {
    collapseOpen: boolean;
};

export function GameRowItem(props: Props) {
    const { id, isInstalled, iconUrl, title, gameId, year,
        source, tags, series, link, isHidden, collapseOpen,
    } = props;
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(`${title} ${year ? year : ""}`.trim());
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            // no-op: we could surface a toast if the host app has one
        }
    };

    return (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: GRID.cols,
                alignItems: "center",
                gap: 12,
                height: GRID.rowHeight,
            }}
        >
            {/* Icon */}
            <Flex align="center" gap={8} className={isHidden ? " is-dim" : ""} style={{ width: GRID.rowHeight }}>
                <Box className="icon-wrap" style={{ position: "relative", width: GRID.smallBox, height: GRID.smallBox }}>
                    <PlayActionOverlay installed={isInstalled} href={`playnite://play/${id}`} title={title}>
                        <Box className="icon-base">
                            <IconImage src={iconUrl ?? ""} />
                        </Box>
                    </PlayActionOverlay>
                </Box>
            </Flex>

            {/* Title + copy */}
            <Flex align="center" gap={8} className={isHidden ? " is-dim" : ""} style={{ minWidth: 0 }}>
                <Text
                    fw={600}
                    title={title}
                    className="game-title"
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
                <Box style={{ marginLeft: "auto" }} />

                {/* Copy title */}
                {title && (
                    <Tooltip label={copied ? "Copied!" : "Copy me!"} withArrow position="top">
                        <ActionIcon
                            aria-label={`Copy title of ${title}`}
                            title="Copy title"
                            onClick={handleCopy}
                            onMouseDown={(e) => e.stopPropagation()}
                            variant="subtle"
                            size="xs"
                            style={{ lineHeight: 0 }}
                        >
                            <IconCopy size={18} stroke={2} />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Flex>

            {/* Year */}
            <Box className={isHidden ? " is-dim" : ""} ta="center">
                {year && (
                    <Text style={{ fontSize: 14 }}>{year}</Text>
                )}
            </Box>

            {/* Source + link */}
            <Box className={isHidden ? " is-dim" : ""} ta="center">
                <Group gap={6} align="center" wrap="nowrap" style={{ justifyContent: "center" }}>
                    {/* External link */}
                    {link && (
                        <Tooltip label={link} withArrow position="top">
                            <ActionIcon
                                component="a"
                                href={link}
                                target="_blank"
                                rel="noopener"
                                aria-label={`Open link for ${title}`}
                                title={`Open link for ${title}`}
                                onClick={(e) => e.stopPropagation()}
                                variant="subtle"
                                size="sm"
                                style={{ lineHeight: 0 }}
                            >
                                <IconExternalLink size={18} stroke={2} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {/* Source */}
                    <SourceBadge source={source} gameId={gameId} href={link} />
                </Group>
            </Box>

            {/* Series */}
            <Flex align="center" gap={8} className={isHidden ? " is-dim" : ""} style={{ minWidth: 0 }}>
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

            {/* Tags */}
            {/* <Box className={isHidden ? " is-dim" : ""} style={{ display: collapseOpen ? "none" : undefined }}>
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