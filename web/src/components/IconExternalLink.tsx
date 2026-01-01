import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCircleArrowUpRightFilled } from "@tabler/icons-react";
import { InterLinkedGameItem } from "../types/interlinked";

type Props = Pick<InterLinkedGameItem, "htmlLink" | "title">;

export const IconLinkExternal = memo(function IconLinkExternal({
    htmlLink, title,
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
                <IconCircleArrowUpRightFilled size={16} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});