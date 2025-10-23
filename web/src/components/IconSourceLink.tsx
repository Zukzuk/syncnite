import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { iconForSource, sourceProtocolLink } from "../lib/utils";
import { SOURCE_MAP } from "../lib/constants";
import { Row } from "../features/hooks/useLibrary";

type Props = Pick<Row, "source" | "gameId" | "link">;

export const IconSourceLink = React.memo(function IconSourceLink({
    source,
    link,
    gameId,
}: Props) {
    if (!source) return null;

    const protocolLink = sourceProtocolLink(source, gameId, link);
    const Icon = iconForSource(source);

    return (
        <Tooltip label={SOURCE_MAP[source]?.platform} withArrow position="top">
            <ActionIcon
                component="a"
                rel="noopener"
                href={protocolLink ?? ""}
                aria-label={`Goto game in ${source}`}
                onClick={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                <Icon size={18} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});
