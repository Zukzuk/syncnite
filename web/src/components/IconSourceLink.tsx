import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
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
import { SOURCE_MAP } from "../lib/constants";
import { GameItem } from "../types/types";

type Props = Pick<GameItem, "source" | "gameId" | "link">;

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

function sourceProtocolLink(source: string, gameId: string | null, href: string | null): string | null {
    if (!source || !gameId) return null;
    const s = source.toLowerCase();

    switch (s) {
        case "steam":
            return `${SOURCE_MAP.steam.platform}store/${encodeURIComponent(gameId)}`;

        case "gog":
            return `${SOURCE_MAP.gog.platform}openGameView/${encodeURIComponent(gameId)}`;

        case "epic": {
            // get epic slug after product/ or p/ from href if possible
            const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
            return slug ? `${SOURCE_MAP.epic.platform}store/product/${encodeURIComponent(slug)}?action=show` : `${SOURCE_MAP.epic.platform}`;
            //return `com.epicgames.launcher://store/product/${encodeURIComponent(gameId)}?action=show`;
        }

        case "ubisoft connect":
        case "uplay":
        case "ubisoft":
            return `${SOURCE_MAP["ubisoft connect"].platform}launch/${encodeURIComponent(gameId)}/0`;

        case "ea app":
            return `${SOURCE_MAP["ea app"].platform}launchbyname/${encodeURIComponent(gameId)}`;

        case "battle.net":
            return `${SOURCE_MAP["battle.net"].platform}${encodeURIComponent(gameId)}`;

        case "xbox":
            return `${SOURCE_MAP.xbox.platform}store/${encodeURIComponent(gameId)}`;

        case "humble":
            return null;

        case "nintendo":
            return null;

        case "microsoft store":
            return `${SOURCE_MAP["microsoft store"].platform}pdp/?productid=${encodeURIComponent(gameId)}`;

        default:
            return null;
    }
}

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
                <Icon size={14} stroke={2} />
            </ActionIcon>
        </Tooltip>
    );
});
