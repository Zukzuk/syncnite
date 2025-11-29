
import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { SOURCE_MAP } from "../lib/constants";
import { GameItem } from "../types/types";

type Props = Pick<GameItem, "link" | "title" | "source">;

export const ExternalLink = React.memo(function ExternalLink({
    link,
    title,
    source,
}: Props) {
    if (!link) return null;
    return (
        <Tooltip label={SOURCE_MAP[source]?.online} withArrow position="top">
             <ActionIcon
                component="a"
                href={link}
                target="_blank"
                rel="noopener"
                aria-label={`Open link for ${title}`}
                onClick={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                <IconExternalLink size={14} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});