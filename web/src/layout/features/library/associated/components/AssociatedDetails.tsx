import { useState } from "react";
import { Anchor, Badge, Box, Group, Image, Stack, Text } from "@mantine/core";
import { InterLinkedGameItem, InterLinkedGrid } from "../../../../../types/interlinked";
import { useDelayedFlag } from "../../../../hooks/useDelayedFlag";
import { IconIsInstalled } from "../../../../components/IconIsInstalled";
import { IconExecuteOverlay } from "../../../../components/IconExecuteOverlay";
import { IconLinkOrigin } from "../../../../components/IconOriginLink";
import { IconLinkSource } from "../../../../components/IconSourceLink";
import { IconLinkExternal } from "../../../../components/IconExternalLink";
import { IconShowMaximized } from "../../../../components/IconShowMaximized";

type Props = {
    item: InterLinkedGameItem;
    grid: InterLinkedGrid;
    isDark: boolean;
    openDeckKey: string | null;
    onBadgeClick: (key: string) => void;
    onWallpaperBg: (hovered: boolean) => void;
};

// Component to display associated details of a library item.
export function AssociatedDetails({ item, grid, isDark, openDeckKey, onBadgeClick, onWallpaperBg }: Props): JSX.Element {

    const { id, playniteLink, sortingName, tags = [], series = [], isInstalled, isHidden, developers,
        links, coverUrl, bgUrl, origin, htmlLink, playniteOpenLink, title, source, sourceLink } = item;

    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 70 });
    const [isBgHovered, setIsBgHovered] = useState(false);

    return (
        <Stack
            gap={6}
            align="flex-start"
            className="subtle-scrollbar"
            pr={grid.gap}
            pb={grid.gap}
            style={{
                width: grid.coverWidth + grid.gap * 2,
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehaviorY: "contain",
                opacity: isOpenDelayed ? 1 : 0,
                transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        >
            <Box
                mb={4}
                style={{
                    position: "relative",
                    border: isDark
                        ? "2px solid var(--mantine-color-dark-8)"
                        : "2px solid var(--mantine-color-gray-3)",
                    boxShadow: "0 0px 8px rgba(0, 0, 0, 0.35)",
                }}
            >
                <Box
                    style={{
                        display: "block",
                        position: "relative",
                        overflow: "hidden",
                        width: grid.coverWidth,
                        height: grid.coverHeight,
                    }}
                    onMouseEnter={() => setIsBgHovered(true)}
                    onMouseLeave={() => setIsBgHovered(false)}
                >
                    <Image
                        src={coverUrl}
                        alt={sortingName || "cover"}
                        radius="sm"
                        fit="cover"
                        loading="lazy"
                        style={{
                            aspectRatio: grid.ratio,
                        }}
                    />

                    <IconIsInstalled
                        isListView={false}
                        isInstalled={isInstalled}
                    />

                    <IconExecuteOverlay
                        type="circle"
                        iconSize={30}
                        title={title}
                        w={grid.coverWidth}
                        h={grid.coverHeight}
                        isInstalled={isInstalled}
                        showOverlay={isBgHovered}
                        link={playniteLink}
                    />
                </Box>
            </Box>

            <Stack gap={6} align="stretch" style={{ width: "100%" }}>
                {/* State */}
                <Box>
                    <Text
                        size="xs"
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        State
                    </Text>
                    <Group gap={6} mt={6} wrap="wrap">
                        <Badge
                            size="xs"
                            color={isInstalled
                                ? "var(--interlinked-color-success)"
                                : "var(--interlinked-color-dark)"}
                            variant="filled"
                        >
                            {isInstalled ? "Installed" : "Not installed"}
                        </Badge>
                        {isHidden && (
                            <Badge
                                size="xs"
                                variant="filled"
                                color="var(--interlinked-color-warning)"
                            >
                                Hidden
                            </Badge>
                        )}
                    </Group>
                </Box>

                {/* Sources */}
                <Box>
                    <Text
                        size="xs"
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Sources
                    </Text>
                    {developers.map((d) => (
                        <Group gap={6} mt={6} pl={2} wrap="wrap">
                            <Text
                                size="xs"
                                c="var(--interlinked-color-primary-soft)"
                                onClick={() => onBadgeClick(`developer-${d}`)}
                                style={{
                                    fontWeight: openDeckKey === `developer-${d}` ? 700 : 500,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer"
                                }}
                            >
                                {d}
                            </Text>
                        </Group>
                    ))} 
                    <Group gap={6} mt={6} wrap="wrap">
                        <IconLinkOrigin origin={origin} playniteOpenLink={playniteOpenLink} id={id} />
                        {origin !== source && <IconLinkSource source={source} sourceLink={sourceLink} />}
                        <IconLinkExternal source={source} htmlLink={htmlLink} title={title} />
                    </Group>
                </Box>

                {/* Series */}
                {series.length > 0 && (
                    <Box>
                        <Text
                            size="xs"
                            style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Series
                        </Text>
                        <Group gap={6} mt={6} wrap="wrap">
                            {series.map((s) => (
                                <Badge
                                    key={s}
                                    size="xs"
                                    variant={openDeckKey === `series-${s}` ? "filled" : "outline"}
                                    onClick={() => onBadgeClick(`series-${s}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </Group>
                    </Box>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                    <Box>
                        <Text
                            size="xs"
                            style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Tags
                        </Text>
                        <Group gap={6} mt={6} wrap="wrap">
                            {tags.map((t) => (
                                <Badge
                                    key={t}
                                    size="xs"
                                    variant={openDeckKey === `tag-${t}` ? "filled" : "outline"}
                                    onClick={() => onBadgeClick(`tag-${t}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                    {t}
                                </Badge>
                            ))}
                        </Group>
                    </Box>
                )}

                {/* Background Image */}
                <Box>
                    <Text
                        size="xs"
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Media
                    </Text>
                    <Group gap={6} mt={6} wrap="wrap" style={{ position: "relative", width: "100%" }}>
                        <Image
                            src={bgUrl}
                            alt={sortingName || "wallpaper"}
                            w={grid.coverWidth}
                            radius="sm"
                            fit="cover"
                            loading="lazy"
                            style={{
                                border: isDark
                                    ? "2px solid var(--mantine-color-dark-8)"
                                    : "2px solid var(--mantine-color-gray-3)",
                                boxShadow: "0 0px 8px rgba(0, 0, 0, 0.35)",
                            }}
                        />
                        <IconShowMaximized
                            onHoverChange={onWallpaperBg}
                        />
                    </Group>
                </Box>

                {/* Links */}
                {Array.isArray(links) && links.length > 0 && (
                    <Box>
                        <Text
                            size="xs"
                            style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Links
                        </Text>
                        <Stack gap={2} mt={2} style={{ width: "100%" }}>
                            {links
                                .filter((l) => l?.Url)
                                .map((l, idx) => (
                                    <Anchor
                                        key={`${l.Url}-${idx}`}
                                        href={l.Url!}
                                        target="_blank"
                                        rel="noreferrer"
                                        size="xs"
                                        onClick={(e) => e.stopPropagation()}
                                        title={l.Url!}
                                        style={{
                                            display: "block",
                                            maxWidth: "100%",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {l.Url}
                                    </Anchor>
                                ))}
                        </Stack>
                    </Box>
                )}

            </Stack>
        </Stack>
    );
}
