import { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Stack, Text, Tooltip, ScrollArea, NavLink, Group } from "@mantine/core";
import { IconAlignBoxLeftBottom, IconLibraryPhoto, IconDeviceTv, IconAffiliate, IconLogout2, IconUserHexagon } from "@tabler/icons-react";
import { WEB_APP_VERSION } from "../constants";
import { InterLinkedGrid } from "../types/interlinked";
import { useAuth } from "../hooks/useAuth";
import { LogoIntro } from "../components/LogoIntro";
import { ControlPanel } from "../features/controlpanel/ControlPanel";
import { IconButton } from "../components/IconButton";

type Props = {
    hasNavbar: boolean;
    isDark: boolean;
    grid: InterLinkedGrid;
    gateStyle: CSSProperties;
    desktopMini?: boolean;
    onIntroDone: () => void;
    toggleNavbar: () => void;
};

export function AppNavbar({ toggleNavbar, onIntroDone, gateStyle, desktopMini = false, hasNavbar, isDark, grid }: Props): JSX.Element {
    const { state, logout } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const location = useLocation();

    const isHome = location.pathname === "/";
    const isLibrary = location.pathname.startsWith("/library");
    const isNarrowcast = location.pathname.startsWith("/narrowcast");
    const isBridge = location.pathname.startsWith("/bridge");
    const isAccount = location.pathname.startsWith("/account");

    // On mobile (no menu), close overlay after selection
    const onNavClick = hasNavbar ? undefined : toggleNavbar;

    const navLinkSWrapper = (label: string, node: ReactNode) =>
        desktopMini ? (
            <Tooltip withArrow position="right" label={label}>
                <Box>{node}</Box>
            </Tooltip>
        ) : (
            node
        );

    const navLinkStyles = {
        root: {
            borderRadius: 0,
            padding: desktopMini ? grid.gap : undefined,
            justifyContent: desktopMini ? "center" : undefined,
        },
        body: {
            display: desktopMini ? "none" : undefined, 
        },
        section: {
            marginInlineEnd: desktopMini ? 0 : undefined,
        },
        label: {
            display: desktopMini ? "none" : undefined,
        },
    } as const;

    return (
        <Stack
            h="100%"
            w={desktopMini ? grid.navBarMiniWidth : grid.navBarWidth}
            gap={0}
            style={{
                backgroundColor: "var(--interlinked-color-body)",
                boxShadow: isDark 
                    ? "3px 0 12px rgba(0, 0, 0, 0.2)" 
                    : "3px 0 12px rgba(0, 0, 0, 0.1)",
            }}
        >
            {/* Top row */}
            <Box px="xs" style={{ height: grid.rowHeight, position: "relative" }}>
                <Group h="100%" justify={desktopMini ? "center" : "flex-start"}>
                    <LogoIntro onDone={onIntroDone} desktopMini={desktopMini} />
                </Group>
            </Box>

            {/* Middle */}
            <Box style={{ flex: 1, minHeight: 0, paddingTop: grid.halfRowHeight, ...gateStyle }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Stack gap={6} px={desktopMini ? grid.gap : 0}>
                        {navLinkSWrapper(
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

                        {navLinkSWrapper(
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

                        {navLinkSWrapper(
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

                        {navLinkSWrapper(
                            "Account",
                            <NavLink
                                component={Link}
                                onClick={onNavClick}
                                to="/account"
                                label="Account"
                                leftSection={<IconUserHexagon color="var(--interlinked-color-secondary)" size={18} />}
                                active={isAccount}
                                variant="light"
                                styles={navLinkStyles}
                            />
                        )}

                        {isAdmin &&
                            navLinkSWrapper(
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
            <Box px={desktopMini ? grid.gap : "sm"} py="xs" style={gateStyle}>
                <Stack gap="xs" align={desktopMini ? "center" : "stretch"}>

                    <ControlPanel
                        desktopMini={desktopMini}
                        toggleNavbar={toggleNavbar}
                    />

                    <IconButton
                        label={`Logout ${state.email} (${state.role})`}
                        onClick={logout}
                        icon={<IconLogout2 color="var(--interlinked-color-secondary)" size={14} />}
                        text={desktopMini ? undefined : "Logout"}
                        type="button"
                        style={{
                            width: hasNavbar ? "100%" : "130px",
                        }}
                    />

                    {!desktopMini && (
                        <Text size="xs" mt="xs" c="dimmed">
                            {WEB_APP_VERSION}
                        </Text>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}
