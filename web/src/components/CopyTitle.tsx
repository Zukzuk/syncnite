
import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { GameItem } from "../types/types";

type Props = Pick<GameItem, "title" | "year">;

export const CopyTitle = React.memo(function CopyTitle({
    title,
    year,
}: Props) {
    if (!title) return null;

    const [copied, setCopied] = React.useState(false);

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
        <Tooltip label={copied ? "Copied!" : "Copy title"} withArrow position="top">
            <ActionIcon
                component="a"
                rel="noopener"
                aria-label={`Copy ${title}`}
                onClick={handleCopy}
                onMouseDown={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                <IconCopy size={14} stroke={2}  />
            </ActionIcon>
        </Tooltip>
    );
});