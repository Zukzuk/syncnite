import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { InterLinkedGameItem } from "../types/interlinked";
import { PLAYNITE_SOURCE_MAP } from "../services/PlayniteService";
import { CustomIconSVG } from "./CustomIcon";
import { CustomIconType } from "../types/app";

type Props = Pick<InterLinkedGameItem, "origin" | "playniteOpenLink" | "id">;

export const IconLinkOrigin = memo(function IconLinkOrigin({
    origin,
    id,
    playniteOpenLink,
}: Props) {
    if (!origin || !id) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={PLAYNITE_SOURCE_MAP[origin ?? ""]?.platform}
            withArrow
            position="top"
        >
            <ActionIcon
                component="a"
                rel="noopener"
                href={playniteOpenLink ?? ""}
                aria-label={`Goto game in ${origin}`}
                onClick={(e) => e.stopPropagation()}
                variant="subtle"
                size="sm"
                style={{ lineHeight: 0, height: "100%", display: "flex", alignItems: "center" }}
            >
                <CustomIconSVG type={origin as CustomIconType} size={14} />
            </ActionIcon>
        </Tooltip>
    );
});
