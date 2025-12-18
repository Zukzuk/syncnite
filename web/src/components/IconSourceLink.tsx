import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { SOURCE_MAP } from "../lib/constants";
import { GameItem } from "../types/types";

type Props = Pick<GameItem, "source" | "sourceLink">;

export const IconLinkSource = React.memo(function IconLinkSource({
    source,
    sourceLink,
}: Props) {
    if (!sourceLink) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={SOURCE_MAP[source].platform}
            withArrow
            position="top"
        >
            <ActionIcon
                component="a"
                rel="noopener"
                href={sourceLink ?? ""}
                aria-label={`Goto game in ${source}`}
                onClick={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                { SOURCE_MAP[source]?.icon }
            </ActionIcon>
        </Tooltip>
    );
});
