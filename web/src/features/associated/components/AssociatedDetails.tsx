import { Anchor, Badge, Box, Group, Image, Stack, Text } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";
import { IconShowMaximized } from "../../../components/IconShowMaximized";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";
import { IconLinkExternal } from "../../../components/IconExternalLink";
import { IconLinkSource } from "../../../components/IconSourceLink";
import { IconIsInstalled } from "../../../components/IconIsInstalled";

type Props = {
    item: GameItem;
    onWallpaperBg: (hovered: boolean) => void;
};

// Component to display associated details of a library item.   
export function AssociatedDetails({ item, onWallpaperBg }: Props): JSX.Element {
    const { sortingName, tags = [], series = [], isInstalled, isHidden, links, coverUrl, bgUrl, source, htmlLink, sourceLink, title } = item;
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 70 });
    const { isDark, grid } = useInterLinkedTheme();

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
                    w={grid.coverWidth}
                    h={grid.coverHeight}
                    style={{
                        position: "relative",
                        overflow: "hidden",
                    }}
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
                </Box>
            </Box>

            <Stack gap={6} align="stretch" style={{ width: "100%" }}>
                {/* Badges */}
                <Group gap={6} wrap="wrap">
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
                    <IconLinkExternal source={source} htmlLink={htmlLink} title={title} />
                    <IconLinkSource source={source} sourceLink={sourceLink} />
                </Group>

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
                                <Badge key={s} size="xs" variant="filled">
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
                                <Badge key={t} size="xs" variant="filled">
                                    {t}
                                </Badge>
                            ))}
                        </Group>
                    </Box>
                )}
            </Stack>

            {/* Background Image */}
            <Stack gap={6} align="stretch" style={{ position: "relative", width: "100%" }}>
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
            </Stack>

            {/* Links */}
            <Stack gap={6} align="stretch" style={{ width: "100%" }}>
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
