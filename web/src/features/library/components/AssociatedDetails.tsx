import { Anchor, Badge, Box, Group, Image, Stack, Text } from "@mantine/core";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { GameItem } from "../../../types/types";
import { GRID } from "../../../lib/constants";
import { getTheme } from "../../../lib/utils";

type Props = {
    item: GameItem;
    onWallpaperBg: (hovered: boolean) => void;
};

// Component to display associated details of a library item.   
export function AssociatedDetails({ item, onWallpaperBg }: Props): JSX.Element {
    const { sortingName, tags = [], series = [], isInstalled, isHidden, links, coverUrl, bgUrl } = item;
    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 70 });
    const { isDark } = getTheme();

    return (
        <Stack
            gap={6}
            align="flex-start"
            className="subtle-scrollbar"
            pr={GRID.gap}
            pb={GRID.gap}
            style={{
                width: GRID.coverWidth + GRID.gap + 4,
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
            <Image
                src={coverUrl}
                alt={sortingName || "cover"}
                w={GRID.coverWidth}
                mb={4}
                radius="sm"
                fit="cover"
                loading="lazy"
                style={{
                    border: isDark
                        ? "2px solid var(--mantine-color-dark-9)"
                        : "2px solid var(--mantine-color-gray-3)",
                }}
            />

            <Stack gap={6} align="stretch" style={{ width: "100%" }}>
                {/* Badges */}
                <Group gap={6} wrap="wrap">
                    <Badge
                        size="xs"
                        color={isInstalled ? "var(--interlinked-color-success)" : "var(--interlinked-color-suppressed)"}
                        variant="filled"
                    >
                        {isInstalled ? "Installed" : "Not installed"}
                    </Badge>

                    {isHidden && (
                        <Badge size="xs" color="var(--interlinked-color-warning)" variant="filled">
                            Hidden
                        </Badge>
                    )}
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
            <Image
                src={bgUrl}
                alt={sortingName || "wallpaper"}
                w={GRID.coverWidth}
                my={6}
                radius="sm"
                fit="cover"
                loading="lazy"
                style={{
                    border: isDark
                        ? "2px solid var(--mantine-color-dark-9)"
                        : "2px solid var(--mantine-color-gray-3)",
                }}
                onMouseOver={() => onWallpaperBg(true)}
                onMouseOut={() => onWallpaperBg(false)}
            />

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
