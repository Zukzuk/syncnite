import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFullscreen } from "@mantine/hooks";
import { ActionIcon, Box, Center, Group, Loader, Paper, Text, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconChevronRight, IconMoon, IconSun, IconX } from "@tabler/icons-react";
import { INTERVAL_MS } from "../constants";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { PLAYNITE_SOURCE_MAP } from "../services/PlayniteService";
import { usePlayniteData } from "../hooks/usePlayniteData";
import { InterLinkedGameItem, InterLinkedOrigin } from "../types/interlinked";

const DISPLAY_MS = 10_000;
const FADE_MS = 900;
const UI_IDLE_MS = 2500;

function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function clampIndex(i: number, n: number) {
    if (n <= 0) return 0;
    return ((i % n) + n) % n;
}

function preload(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
            try {
                if ("decode" in img) await (img as any).decode();
            } catch { }
            resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

export default function NarrowcastPage(): JSX.Element {
    const { libraryData } = usePlayniteData({ pollMs: INTERVAL_MS });
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { grid, isDark, setColorScheme } = useInterLinkedTheme();
    const toggleColorScheme = () => setColorScheme(isDark ? "light" : "dark");
    const [isHovered, setIsHovered] = useState(false);

    const items = useMemo(() => {
        // Hardcode to Playnite for now
        const src = libraryData?.playnite?.items ?? [];
        return src.filter((g: InterLinkedGameItem) => !!g.coverUrl && !g.isHidden) as InterLinkedGameItem[];
    }, [libraryData]);

    const [order, setOrder] = useState<InterLinkedGameItem[]>([]);
    useEffect(() => {
        if (!items.length) return;
        setOrder(shuffle(items));
    }, [items.length]);

    const n = order.length;

    // slideshow core state
    const [idx, setIdx] = useState(0);
    const [urls, setUrls] = useState<[string | null, string | null]>([null, null]); // [layer0, layer1]
    const [active, setActive] = useState<0 | 1>(0); // which layer is visible

    // fullscreen
    const { ref: fsRef, toggle: toggleFs, fullscreen } = useFullscreen();

    // NEW: idle UI visibility
    const [uiVisible, setUiVisible] = useState(true);
    const idleTimer = useRef<number | null>(null);

    const bumpUi = useCallback(() => {
        setUiVisible(true);
        if (idleTimer.current) window.clearTimeout(idleTimer.current);
        idleTimer.current = window.setTimeout(() => setUiVisible(false), UI_IDLE_MS);
    }, []);

    useEffect(() => {
        if (!n) return;
        bumpUi();
        return () => {
            if (idleTimer.current) window.clearTimeout(idleTimer.current);
        };
    }, [n, bumpUi]);

    const chromeStyle: CSSProperties = useMemo(
        () => ({
            opacity: uiVisible ? 1 : 0,
            transition: "opacity 500ms ease",
            pointerEvents: uiVisible ? "auto" : "none",
        }),
        [uiVisible]
    );

    // derive current (the actually-visible item index)
    const current = n ? order[clampIndex(idx, n)] : null;
    const label = current?.source as InterLinkedOrigin ? `${PLAYNITE_SOURCE_MAP[current?.source as keyof typeof PLAYNITE_SOURCE_MAP]?.label}` : " ";

    // choose start index from route once we have order
    useEffect(() => {
        if (!n) return;

        let startIdx = 0;
        if (id) {
            const found = order.findIndex((g) => String(g.id) === id);
            if (found >= 0) startIdx = found;
        }

        setIdx(startIdx);
        navigate(`/narrowcast/${String(order[startIdx]?.id)}`, { replace: true });
    }, [n, order, id, navigate]);

    // BOOTSTRAP: load first 2 and set up layers: layer0 visible, layer1 hidden
    useEffect(() => {
        if (!n) return;

        let cancelled = false;
        (async () => {
            const i0 = clampIndex(idx, n);
            const i1 = clampIndex(idx + 1, n);

            const u0 = order[i0]?.coverUrl;
            const u1 = order[i1]?.coverUrl;

            if (!u0) return;

            await preload(u0);
            if (u1) await preload(u1);

            if (cancelled) return;

            setActive(0);
            setUrls([u0, u1 ?? null]);
        })();

        return () => {
            cancelled = true;
        };
    }, [n, order]);

    const goTo = useCallback(
        async (nextIdxRaw: number) => {
            if (!n) return;

            const nextIdx = clampIndex(nextIdxRaw, n);
            const afterIdx = clampIndex(nextIdx + 1, n);

            const nextUrl = order[nextIdx]?.coverUrl;
            const afterUrl = order[afterIdx]?.coverUrl;

            if (!nextUrl) return;

            // Ensure the hidden layer has nextUrl before fade starts.
            const hidden: 0 | 1 = active === 0 ? 1 : 0;

            if (urls[hidden] !== nextUrl) {
                await preload(nextUrl);
                setUrls((prev) => {
                    const out: [string | null, string | null] = [prev[0], prev[1]];
                    out[hidden] = nextUrl;
                    return out;
                });
            }

            setActive(hidden);
            setIdx(nextIdx);
            navigate(`/narrowcast/${String(order[nextIdx]?.id)}`, { replace: true });

            window.setTimeout(async () => {
                const nowHidden: 0 | 1 = hidden === 0 ? 1 : 0;
                if (!afterUrl) return;

                await preload(afterUrl);
                setUrls((prev) => {
                    const out: [string | null, string | null] = [prev[0], prev[1]];
                    out[nowHidden] = afterUrl;
                    return out;
                });
            }, FADE_MS + 30);
        },
        [n, order, active, urls, navigate]
    );

    const next = useCallback(() => {
        bumpUi();
        void goTo(idx + 1);
    }, [goTo, idx, bumpUi]);

    const prev = useCallback(() => {
        bumpUi();
        void goTo(idx - 1);
    }, [goTo, idx, bumpUi]);

    // AUTO ADVANCE
    useEffect(() => {
        if (!n) return;
        const t = window.setInterval(() => {
            void goTo(idx + 1);
        }, DISPLAY_MS);
        return () => window.clearInterval(t);
    }, [n, goTo, idx]);

    // KEYBOARD
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            bumpUi();

            if (e.key === "ArrowRight") void goTo(idx + 1);
            if (e.key === "ArrowLeft") void goTo(idx - 1);
            if (e.key.toLowerCase() === "f") toggleFs();
            if (e.key === "Escape") navigate("/library", { replace: true });
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [goTo, idx, toggleFs, navigate, bumpUi]);

    if (!libraryData) {
        return (
            <Center h="100vh" w="100vw">
                <Loader size="md" type="bars" />
            </Center>
        );
    }

    if (!n) {
        return (
            <Center h="100vh" w="100vw">
                <Text c="dimmed">No covers found in library.</Text>
            </Center>
        );
    }

    const layerStyle = (url: string | null, visible: boolean): CSSProperties => ({
        position: "absolute",
        inset: 0,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        willChange: "opacity",
    });

    return (
        <Box
            ref={fsRef}
            onMouseMove={bumpUi}
            onMouseDown={bumpUi}
            onTouchStart={bumpUi}
            onMouseLeave={() => setUiVisible(false)}
            style={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                background: "var(--mantine-color-body)",
                userSelect: "none",
                touchAction: "manipulation",
            }}
        >
            <style>
                {`
          @keyframes narrowcastProgressFill {
            from { transform: scaleX(0); }
            to   { transform: scaleX(1); }
          }
        `}
            </style>

            {/* Crossfade layers */}
            <Box style={layerStyle(urls[0], active === 0)} />
            <Box style={layerStyle(urls[1], active === 1)} />

            {/* Top-right controls (FADES OUT) */}
            <Box style={{ position: "absolute", right: 12, top: 12, zIndex: grid.z.float, ...chromeStyle }}>
                <Group gap={8} justify="flex-end">
                    <Tooltip withArrow label={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ fontSize: 10 }}>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                bumpUi();
                                toggleColorScheme();
                            }}
                        >
                            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip withArrow label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} style={{ fontSize: 10 }}>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                bumpUi();
                                toggleFs();
                            }}
                        >
                            {fullscreen ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip withArrow label="Close (Esc)" style={{ fontSize: 10 }}>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                bumpUi();
                                navigate("/library", { replace: true });
                            }}
                            aria-label="Close"
                        >
                            <IconX size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Box>

            {/* Prev / Next arrows (FADES OUT) */}
            <Box
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    pointerEvents: "none",
                    zIndex: grid.z.float,
                }}
            >
                <Box style={chromeStyle}>
                    <ActionIcon
                        variant="subtle"
                        radius="xl"
                        size="xl"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            prev();
                        }}
                        style={{ pointerEvents: "auto" }}
                        aria-label="Previous"
                    >
                        <IconChevronLeft size={24} />
                    </ActionIcon>
                </Box>

                <Box style={chromeStyle}>
                    <ActionIcon
                        variant="subtle"
                        radius="xl"
                        size="xl"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            next();
                        }}
                        style={{ pointerEvents: "auto" }}
                        aria-label="Next"
                    >
                        <IconChevronRight size={24} />
                    </ActionIcon>
                </Box>
            </Box>

            {/* Click zones */}
            <Box
                onClick={prev}
                style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", cursor: "pointer", zIndex: grid.z.aboveBase }}
            />
            <Box
                onClick={next}
                style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%", cursor: "pointer", zIndex: grid.z.aboveBase }}
            />

            {/* Info panel */}
            <Paper
                withBorder
                radius="md"
                onMouseOver={() => setIsHovered(true)}
                onMouseOut={() => setIsHovered(false)}
                onClick={() => {
                    navigate(`/library/${id}`);
                }}
                style={{
                    position: "absolute",
                    left: 12,
                    bottom: 12,
                    zIndex: grid.z.float,
                    cursor: "pointer",
                    maxWidth: "min(720px, 70vw)",
                    background: isDark 
                        ? "rgba(20, 20, 20, 0.45)" 
                        : "rgba(255, 255, 255, 0.55)",
                    backdropFilter: "blur(14px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(14px) saturate(1.2)",
                    borderColor: isHovered 
                        ? "var(--interlinked-color-primary-soft)" 
                        : isDark 
                            ? "rgba(255, 255, 255, 0.12)" 
                            : "rgba(0, 0, 0, 0.12)",
                    boxShadow: isDark 
                        ? "0 8px 30px rgba(0, 0, 0, 0.55)" 
                        : "0 8px 30px rgba(0, 0, 0, 0.15)",
                }}
            >
                <Group justify="space-between" gap={0} wrap="nowrap">
                    <Box
                        py={grid.gap}
                        px={grid.gap * 2}
                        style={{
                            minWidth: 0,
                            borderRight: isDark 
                                ? "1px solid rgba(255, 255, 255, 0.12)" 
                                : "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                    >
                        <Text
                            fw={600}
                            size="sm"
                            truncate
                            title={current?.title ?? ""}
                            style={{
                                textShadow: "0px 1px 2px var(--interlinked-color-suppressed)",
                            }}
                        >
                            {current?.title ?? ""}
                        </Text>
                        <Text
                            size="xs"
                            truncate
                            style={{
                                textShadow: "0px 1px 2px var(--interlinked-color-suppressed)",
                            }}
                        >
                            {label}
                        </Text>
                    </Box>
                    <Box
                        px={grid.gap * 2}
                        style={{
                            minWidth: 0,
                        }}
                    >
                        <Text
                            size="xs"
                            style={{
                                whiteSpace: "nowrap",
                                textShadow: "0px 1px 2px var(--interlinked-color-suppressed)",
                            }}
                        >
                            {clampIndex(idx, n) + 1} / {n}
                        </Text>
                    </Box>
                </Group>
            </Paper>

            {/* Progress bar */}
            <Box
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 1,
                    background: "var(--interlinked-color-suppressed)",
                    zIndex: grid.z.medium,
                    overflow: "hidden",
                }}
            >
                <Box
                    key={idx}
                    style={{
                        height: "100%",
                        width: "100%",
                        background: "var(--interlinked-color-primary-soft)",
                        transformOrigin: "left center",
                        animation: `narrowcastProgressFill ${DISPLAY_MS}ms linear forwards`,
                    }}
                />
            </Box>
        </Box>
    );
}
