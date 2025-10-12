import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { iconForSource, sourceProtocolLink } from "../../lib/utils";
import { SOURCE_SHORTNAME_MAP } from "../../lib/constants";
import { Row } from "../hooks/useLibrary";

type Props = Pick<Row, "source" | "raw" | "title" | "id"> & {
    onClick?: (e: React.MouseEvent) => void;
};

export const SourceBadge = React.memo(function GameRowSourceBadge({
    source,
    raw,
    onClick,
}: Props) {
    if (!source) return null;

    const proto = sourceProtocolLink(source, raw?.GameId ? String(raw.GameId) : "");
    const Icon = iconForSource(source);

    const label = SOURCE_SHORTNAME_MAP[source] ?? source;

    return (
        <Tooltip label={`//:${label}`} withArrow>
            {proto ? (
                <ActionIcon
                    component="a"
                    href={proto}
                    rel="noopener"
                    aria-label={`Goto game in ${source}`}
                    title={`Goto game in ${source}`}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onClick?.(e);
                    }}
                    target={proto.startsWith("http") ? "_blank" : undefined}
                    variant="subtle"
                    size="sm"
                    style={{ lineHeight: 0 }}
                >
                    <Icon size={20} stroke={2} />
                </ActionIcon>
            ) : (
                <ActionIcon
                    component="a"
                    rel="noopener"
                    aria-label={`Goto game in ${source}`}
                    title={`Goto game in ${source}`}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onClick?.(e);
                    }}
                    variant="subtle"
                    size="sm"
                    style={{ lineHeight: 0 }}
                >
                    <Icon size={20} stroke={2} />
                </ActionIcon>
            )}
        </Tooltip>
    );
});
