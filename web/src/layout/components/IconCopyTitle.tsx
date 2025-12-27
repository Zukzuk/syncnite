
import { memo, useState, MouseEvent } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { InterLinkedGameItem } from "../../types/interlinked";

type Props = Pick<InterLinkedGameItem, "title" | "year">;

export const IconCopyTitle = memo(function IconCopyTitle({
    title,
    year,
}: Props) {
    if (!title) return null;

    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: MouseEvent) => {
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
        <Tooltip 
            style={{ fontSize: 10 }} 
            label={copied ? "Copied!" : "Copy title"} 
            withArrow 
            position="top"
        >
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
                <IconCopy size={14} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});