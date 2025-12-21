import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { GameItem } from "../types/types";
import { PLAYNITE_SOURCE_MAP } from "../services/PlayniteService";

type Props = Pick<GameItem, "source" | "sourceLink">;

export const IconLinkSource = memo(function IconLinkSource({
    source,
    sourceLink,
}: Props) {
    if (!sourceLink) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={PLAYNITE_SOURCE_MAP[source].platform}
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
                { PLAYNITE_SOURCE_MAP[source]?.icon }
            </ActionIcon>
        </Tooltip>
    );
});
