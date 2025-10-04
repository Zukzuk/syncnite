import React, { useState } from "react";
import { Box, Flex, Text, Group, Badge, Tooltip, ActionIcon, Grid } from "@mantine/core";
import { PlayActionOverlay } from "./PlayActionOverlay";
import { IconImage } from "./IconImage";
import { GRID } from "../../lib/constants";
import { SourceBadge } from "./SourceBadge";
import { Row } from "../../lib/types";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";

type Props = Row & {
    collapseOpen: boolean;
    dim?: boolean;
    href?: string | null;
};

export function GameRowItem(props: Props) {
    const { id, installed, iconUrl, title, year, source, tags, raw, href, dim, collapseOpen } = props;

    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(`${title} ${year}`.trim());
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
            <Flex
                align="center"
                gap={8}
                style={{ width: GRID.rowHeight }}
                className={dim ? " is-dim" : ""}
            >
                <Box className="icon-wrap" style={{ position: "relative", width: GRID.smallBox, height: GRID.smallBox }}>
                    <PlayActionOverlay installed={installed} href={`playnite://play/${id}`} title={title}>
                        <Box className="icon-base">
                            <IconImage src={iconUrl} />
                        </Box>
                    </PlayActionOverlay>
                </Box>
            </Flex>

            {/* Title + copy + external link */}
            <Flex align="center" gap={8} className={dim ? " is-dim" : ""} style={{ minWidth: 0 }}>
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
                    <Tooltip label={copied ? "Copied!" : "Copy title"} withArrow position="top">
                        <ActionIcon
                            aria-label={`Copy title of ${title}`}
                            title={copied ? "Copied!" : "Copy title"}
                            onClick={handleCopy}
                            onMouseDown={(e) => e.stopPropagation()}
                            variant="subtle"
                            size="sm"
                            style={{ lineHeight: 0 }}
                        >
                            <IconCopy size={18} stroke={2} />
                        </ActionIcon>
                    </Tooltip>
                )}

                {/* External link */}
                {href && (
                    <Tooltip label={href} withArrow position="top">
                        <ActionIcon
                            component="a"
                            href={href}
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
            </Flex>

            {/* Year */}
            <Box className={dim ? " is-dim" : ""} ta="center">
                {year ? <Text>{year}</Text> : ""}
            </Box>

            {/* Source */}
            <Box className={dim ? " is-dim" : ""} ta="center">
                <SourceBadge source={source} raw={raw} title={title} id={id} />
            </Box>

            {/* Tags */}
            <Box className={dim ? " is-dim" : ""} style={{ display: collapseOpen ? "none" : undefined }}>
                <Group gap={6} align="center" wrap="wrap" style={{ maxHeight: GRID.rowHeight, overflow: "hidden" }}>
                    {(tags ?? []).map((t) => (
                        <Badge key={t} variant="dark" size="sm" style={{ boxShadow: "0 2px 0 0 rgb(0 0 0 / 30%)" }}>
                            {t}
                        </Badge>
                    ))}
                </Group>
            </Box>
        </Box>
    );
}