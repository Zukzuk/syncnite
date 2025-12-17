import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Stack, Text, Button, Tooltip, ScrollArea, NavLink } from "@mantine/core";
import { IconUser, IconShield, IconLogout2, IconDeviceTv, IconLibraryPhoto, IconAlignBoxLeftBottom, IconAffiliate } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { GRID, WEB_APP_VERSION } from "../lib/constants";
import { getTheme } from "../theme";
import { ControlPanel } from "../components/ControlPanel";
import { LogoIntro } from "../components/LogoIntro";

type Props = {
    gateStyle: React.CSSProperties;
    onIntroDone: () => void;
    toggleNavbar: () => void;
};

export function AppNavbar({ toggleNavbar, onIntroDone, gateStyle }: Props): JSX.Element {
    const { state, logout } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const { isDesktop, isDark } = getTheme();
    const location = useLocation();

    const isHome = location.pathname === "/";
    const isLibrary = location.pathname.startsWith("/library");
    const isNarrowcast = location.pathname.startsWith("/narrowcast");
    const isBridge = location.pathname.startsWith("/bridge");
    const isAccount = location.pathname.startsWith("/account");
    const isAdminRoute = location.pathname.startsWith("/admin");

    return (
        <Stack
            h="100%"
            gap={0}
            style={{
                boxShadow: isDark ? "3px 0 12px rgba(0, 0, 0, 0.2)" : "3px 0 12px rgba(0, 0, 0, 0.1)",
            }}
        >
            <Box px="xs" style={{ height: GRID.rowHeight, position: "relative" }}>
                <LogoIntro onDone={onIntroDone} />
            </Box>

            <Box style={{ flex: 1, minHeight: 0, paddingTop: GRID.halfRowHeight, ...gateStyle }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Stack gap={2}>
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/"
                            label="Home"
                            leftSection={<IconAlignBoxLeftBottom color="var(--interlinked-color-secondary)" size={18} />}
                            active={isHome}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/library"
                            label="Library"
                            leftSection={<IconLibraryPhoto color="var(--interlinked-color-secondary)" size={18} />}
                            active={isLibrary}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/narrowcast"
                            label="Cast"
                            leftSection={<IconDeviceTv color="var(--interlinked-color-secondary)" size={18} />}
                            active={isNarrowcast}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/account"
                            label="Account"
                            leftSection={<IconUser color="var(--interlinked-color-secondary)" size={18} />}
                            active={isAccount}
                            variant="light"
                        />
                        {isAdmin && (
                            <>
                                <NavLink
                                    component={Link}
                                    onClick={isDesktop ? undefined : toggleNavbar}
                                    to="/admin"
                                    label="Admin"
                                    leftSection={<IconShield color="var(--interlinked-color-secondary)" size={18} />}
                                    active={isAdminRoute}
                                    variant="light"
                                />
                                <NavLink
                                    component={Link}
                                    onClick={isDesktop ? undefined : toggleNavbar}
                                    to="/bridge"
                                    label="Bridge"
                                    leftSection={<IconAffiliate color="var(--interlinked-color-secondary)" size={18} />}
                                    active={isBridge}
                                    variant="light"
                                />
                            </>
                        )}
                    </Stack>
                </ScrollArea>
            </Box>

            <Box px="sm" py="xs" style={gateStyle}>
                <Stack gap="xs">
                    <ControlPanel toggleNavbar={toggleNavbar} />
                    <Tooltip withArrow label={`Logout ${state.email} (${state.role})`} style={{ fontSize: 10 }}>
                        <Button
                            component="a"
                            onClick={logout}
                            size="xs"
                            radius="sm"
                            variant="light"
                            justify="space-between"
                            rightSection={<span />}
                            leftSection={<IconLogout2 color="var(--interlinked-color-secondary)" size={14} />}
                            style={{ maxWidth: "130px" }}
                        >
                            Logout
                        </Button>
                    </Tooltip>
                </Stack>

                <Text size="xs" mt="xs" c="dimmed">
                    {WEB_APP_VERSION}
                </Text>
            </Box>
        </Stack>
    );
}
