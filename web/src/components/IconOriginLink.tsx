import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { InterLinkedGameItem } from "../types/interlinked";
import { CustomIconSVG } from "./CustomIcon";
import { CustomIconType } from "../types/app";
import { SOURCE_MAP } from "../constants";

type Props = Pick<InterLinkedGameItem, "origin" | "originRunLink" | "id">;

export const IconLinkOrigin = memo(function IconLinkOrigin({
    origin,
    id,
    originRunLink,
}: Props) {
    if (!origin || !id) return null;

    return (
        <Tooltip
            style={{ fontSize: 10 }}
            label={`${SOURCE_MAP[origin].platform?.split("://")[0]}://`}
            withArrow
            position="top"
        >
            <ActionIcon
                component="a"
                rel="noopener"
                href={originRunLink}
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
