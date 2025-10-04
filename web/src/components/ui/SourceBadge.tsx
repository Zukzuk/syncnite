import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { sourceProtocolLink } from "../../lib/utils";
import { Row } from "../../lib/types";
import { sourceTrim } from "../../lib/constants";
import {
    IconBrandSteam,
    IconBox as IconBrandGog,
    IconShieldChevron as IconBrandEpicGames,
    IconBrandFacebook,
    IconBrandTwitter,
    IconBrandInstagram,
    IconBrandYoutube,
    IconBrandDiscord,
    IconBrandTwitch,
    IconBrandWikipedia,
    IconWorldWww,
} from "@tabler/icons-react";

type Props = Pick<Row, "source" | "raw" | "title" | "id"> & {
    onClick?: (e: React.MouseEvent) => void;
};

const iconForSource = (s: string | null | undefined) => {
    const key = (s ?? "").toLowerCase();
    if (key.includes("steam")) return IconBrandSteam;
    if (key.includes("gog")) return IconBrandGog;
    if (key.includes("epic")) return IconBrandEpicGames;
    if (key.includes("facebook")) return IconBrandFacebook;
    if (key.includes("twitter") || key.includes("x")) return IconBrandTwitter;
    if (key.includes("instagram")) return IconBrandInstagram;
    if (key.includes("youtube")) return IconBrandYoutube;
    if (key.includes("discord")) return IconBrandDiscord;
    if (key.includes("twitch")) return IconBrandTwitch;
    if (key.includes("wikipedia")) return IconBrandWikipedia;
    return IconWorldWww;
};

export const SourceBadge = React.memo(function GameRowSourceBadge({
    source,
    raw,
    title,
    id,
    onClick,
}: Props) {
    if (!source) return null;

    const proto = sourceProtocolLink(source, raw?.GameId ? String(raw.GameId) : "");
    const Icon = iconForSource(source);

    const label = sourceTrim[source] ?? source;

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
