import { Link, useLocation } from "react-router-dom";
import { Box, Stack, Text, Button, Tooltip, ScrollArea, NavLink, Group } from "@mantine/core";
import { IconHome2, IconBooks, IconAB2, IconUser, IconShield, IconLogout2, IconDeviceTv } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { GRID, WEB_APP_VERSION } from "../lib/constants";
import { getTheme } from "../theme";
import { Logo } from "../components/Logo";
import { ControlPanel } from "../components/ControlPanel";
import { LogoIntro } from "../components/LogoIntro";

type Props = {
    toggleNavbar: () => void;
};

export function AppNavbar({ toggleNavbar }: Props): JSX.Element {
    const { state, logout } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    const { isDesktop, isDark } = getTheme();

    const location = useLocation();
    const isHome = location.pathname === "/";
    const isLibrary = location.pathname.startsWith("/library");
    const isAccount = location.pathname.startsWith("/account");
    const isAdminRoute = location.pathname.startsWith("/admin");
    const isBridge = location.pathname.startsWith("/bridge");

    return (
        <Stack
            h="100%"
            gap={0}
            style={{
                boxShadow: isDark
                    ? "3px 0 12px rgba(0, 0, 0, 0.2)"
                    : "3px 0 12px rgba(0, 0, 0, 0.1)",
            }}
        >
            {/* LOGO SECTION */}
            <Box
                px="xs"
                style={{
                    height: GRID.rowHeight,
                }}
            >
                <LogoIntro />
            </Box >

            {/* NAVIGATION SECTION */}
            < Box style={{ flex: 1, minHeight: 0, paddingTop: GRID.halfRowHeight }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Stack gap={2}>
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/"
                            label="Home"
                            leftSection={<IconHome2 color="var(--interlinked-color-secondary)" size={18} />}
                            active={isHome}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/library"
                            label="Library"
                            leftSection={<IconBooks color="var(--interlinked-color-secondary)" size={18} />}
                            active={isLibrary}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/narrowcast"
                            label="Narrowcast"
                            leftSection={<IconDeviceTv color="var(--interlinked-color-secondary)" size={18} />}
                            variant="light"
                        />
                        {isLoggedIn && (
                            <NavLink
                                component={Link}
                                onClick={isDesktop ? undefined : toggleNavbar}
                                to="/account"
                                label="Account"
                                leftSection={<IconUser color="var(--interlinked-color-secondary)" size={18} />}
                                active={isAccount}
                                variant="light"
                            />
                        )}
                        {isAdmin && (
                            <NavLink
                                component={Link}
                                onClick={isDesktop ? undefined : toggleNavbar}
                                to="/admin"
                                label="Admin"
                                leftSection={<IconShield color="var(--interlinked-color-secondary)" size={18} />}
                                active={isAdminRoute}
                                variant="light"
                            />
                        )}
                        <NavLink
                            component={Link}
                            onClick={isDesktop ? undefined : toggleNavbar}
                            to="/bridge"
                            label="Bridge"
                            leftSection={<IconAB2 color="var(--interlinked-color-secondary)" size={18} />}
                            active={isBridge}
                            variant="light"
                        />
                    </Stack>
                </ScrollArea>
            </Box >

            {/* ACCOUNT SECTION */}
            <Box
                px="sm"
                py="xs"
            >
                {isLoggedIn ? (
                    <Stack gap="xs">
                        <ControlPanel toggleNavbar={toggleNavbar} />
                        <Tooltip
                            withArrow
                            label={`Logout ${state.email} (${state.role})`}
                            style={{ fontSize: 10 }}
                        >
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
                ) : (
                    <Text size="xs" c="dimmed">
                        Not signed in
                    </Text>
                )}

                <Text size="xs" mt="xs" c="dimmed">
                    {WEB_APP_VERSION}
                </Text>
            </Box>

        </Stack >
    );
}