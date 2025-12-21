import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { GameItem } from "../types/types";

type Props = Pick<GameItem, "htmlLink" | "title" | "source">;

export const IconLinkExternal = memo(function IconLinkExternal({
    htmlLink, title, source,
}: Props) {
    if (!htmlLink) return null;

    return (
        <Tooltip 
            style={{ fontSize: 10 }} 
            label={new URL(htmlLink).hostname ?? null}
            withArrow 
            position="top"
        >
             <ActionIcon
                component="a"
                href={htmlLink}
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