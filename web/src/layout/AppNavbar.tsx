import { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Stack, Text, Tooltip, ScrollArea, NavLink, Group } from "@mantine/core";
import { IconAlignBoxLeftBottom, IconLibraryPhoto, IconDeviceTv, IconUser, IconAffiliate, IconLogout2 } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { WEB_APP_VERSION } from "../constants";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { ControlPanel } from "../features/controlpanel/ControlPanel";
import { LogoIntro } from "../components/LogoIntro";
import { IconButton } from "../components/IconButton";

type Props = {
    gateStyle: CSSProperties;
    mini?: boolean;
    onIntroDone: () => void;
    toggleNavbar: () => void;
};

export function AppNavbar({ toggleNavbar, onIntroDone, gateStyle, mini = false }: Props): JSX.Element {
    const { state, logout } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const { hasMenu, isDark, grid } = useInterLinkedTheme();
    const location = useLocation();

    const isHome = location.pathname === "/";
    const isLibrary = location.pathname.startsWith("/library");
    const isNarrowcast = location.pathname.startsWith("/narrowcast");
    const isBridge = location.pathname.startsWith("/bridge");
    const isAccount = location.pathname.startsWith("/account");

    // On mobile (no menu), close overlay after selection
    const onNavClick = hasMenu ? undefined : toggleNavbar;

    const wrap = (label: string, node: ReactNode) =>
        mini ? (
            <Tooltip withArrow position="right" label={label}>
                <Box>{node}</Box>
            </Tooltip>
        ) : (
            node
        );

    // Mini-mode "rail" style for NavLink
    const navLinkStyles = {
        root: {
            borderRadius: 0,
            padding: mini ? grid.gap : undefined,
            justifyContent: mini ? "center" : undefined,
        },
        body: {
            display: mini ? "none" : undefined, // hide label/description container
        },
        section: {
            // leftSection wrapper
            marginInlineEnd: mini ? 0 : undefined,
        },
        label: {
            display: mini ? "none" : undefined,
        },
    } as const;

    return (
        <Stack
            h="100%"
            gap={0}
            style={{
                boxShadow: isDark ? "3px 0 12px rgba(0, 0, 0, 0.2)" : "3px 0 12px rgba(0, 0, 0, 0.1)",
            }}
        >
            {/* Top row */}
            <Box px="xs" style={{ height: grid.rowHeight, position: "relative" }}>
                <Group h="100%" justify={mini ? "center" : "flex-start"}>
                    <LogoIntro onDone={onIntroDone} />
                </Group>
            </Box>

            {/* Middle */}
            <Box style={{ flex: 1, minHeight: 0, paddingTop: grid.halfRowHeight, ...gateStyle }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Stack gap={6} px={mini ? grid.gap : 0}>
                        {wrap(
                            "Home",
                            <NavLink
                                component={Link}
                                onClick={onNavClick}
                                to="/"
                                label="Home"
                                leftSection={<IconAlignBoxLeftBottom color="var(--interlinked-color-secondary)" size={18} />}
                                active={isHome}
                                variant="light"
                                styles={navLinkStyles}
                            />
                        )}

                        {wrap(
                            "Library",
                            <NavLink
                                component={Link}
                                onClick={onNavClick}
                                to="/library"
                                label="Library"
                                leftSection={<IconLibraryPhoto color="var(--interlinked-color-secondary)" size={18} />}
                                active={isLibrary}
                                variant="light"
                                styles={navLinkStyles}
                            />
                        )}

                        {wrap(
                            "Cast",
                            <NavLink
                                component={Link}
                                onClick={onNavClick}
                                to="/narrowcast"
                                label="Cast"
                                leftSection={<IconDeviceTv color="var(--interlinked-color-secondary)" size={18} />}
                                active={isNarrowcast}
                                variant="light"
                                styles={navLinkStyles}
                            />
                        )}

                        {wrap(
                            "Account",
                            <NavLink
                                component={Link}
                                onClick={onNavClick}
                                to="/account"
                                label="Account"
                                leftSection={<IconUser color="var(--interlinked-color-secondary)" size={18} />}
                                active={isAccount}
                                variant="light"
                                styles={navLinkStyles}
                            />
                        )}

                        {isAdmin &&
                            wrap(
                                "Bridge",
                                <NavLink
                                    component={Link}
                                    onClick={onNavClick}
                                    to="/bridge"
                                    label="Bridge"
                                    leftSection={<IconAffiliate color="var(--interlinked-color-secondary)" size={18} />}
                                    active={isBridge}
                                    variant="light"
                                    styles={navLinkStyles}
                                />
                            )}
                    </Stack>
                </ScrollArea>
            </Box>

            {/* Bottom */}
            <Box px={mini ? grid.gap : "sm"} py="xs" style={gateStyle}>
                <Stack gap="xs" align={mini ? "center" : "stretch"}>

                    <ControlPanel toggleNavbar={toggleNavbar} />

                    <IconButton
                        label={`Logout ${state.email} (${state.role})`}
                        onClick={logout}
                        icon={<IconLogout2 color="var(--interlinked-color-secondary)" size={14} />}
                        text={mini ? "" : "Logout"}
                        type="button"
                        style={{
                            width: mini ? 44 : undefined,
                            minWidth: mini ? 44 : undefined,
                            paddingInline: mini ? 0 : undefined,
                        }}
                    />

                    {!mini && (
                        <Text size="xs" mt="xs" c="dimmed">
                            {WEB_APP_VERSION}
                        </Text>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}
