import { Link, useLocation } from "react-router-dom";
import { Box, Stack, Group, Text, ActionIcon, Button, Tooltip, ScrollArea, NavLink, Badge, useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon, IconDownload, IconHome2, IconBooks, IconAB2, IconUser, IconShield, IconLogout2, IconDeviceTv } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useExtensionStatus } from "../hooks/useExtensionStatus";
import { API_ENDPOINTS, GRID, INTERVAL_MS } from "../lib/constants";

export function AppNavbar({ appVersion }: { appVersion: string; }) {
    const location = useLocation();
    const { state, logout } = useAuth({ pollMs: 0 });
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({ pollMs: INTERVAL_MS });

    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    const toggleColorScheme = () =>
        setColorScheme(colorScheme === "dark" ? "light" : "dark");

    const isHome = location.pathname === "/";
    const isLibrary = location.pathname.startsWith("/library");
    const isBridge = location.pathname.startsWith("/bridge");
    const isAccount = location.pathname.startsWith("/account");
    const isAdminRoute = location.pathname.startsWith("/admin");

    return (
        <Stack h="100%" gap={0}>
            {/* TOP CONTROL PANEL */}
            <Box
                px="xs"
                style={{
                    minHeight: GRID.rowHeight,
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                }}
            >
                <Stack gap="xs">
                    {/* Row 1: title + version + theme toggle */}
                    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                        <Stack gap={0} style={{ flex: 1, minWidth: 0, paddingBlock: 5 }}>
                            <Text fw={700} size="lg" truncate>
                                Syncnite
                            </Text>
                            <Text size="xs" c="dimmed">
                                {appVersion}
                            </Text>
                        </Stack>

                        <Tooltip
                            withArrow
                            label={
                                colorScheme === "dark"
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                            }
                            style={{ fontSize: 10 }}
                        >
                            <ActionIcon
                                variant="subtle"
                                aria-label="Toggle color scheme"
                                onClick={toggleColorScheme}
                                size="md"
                            >
                                {colorScheme === "dark" ? (
                                    <IconSun size={18} />
                                ) : (
                                    <IconMoon size={18} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Stack>
            </Box>

            {/* NAVIGATION SCROLL SECTION */}
            <Box style={{ flex: 1, minHeight: 0 }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Stack gap={2} px="xs" py="xs">
                        <NavLink
                            component={Link}
                            to="/"
                            label="Home"
                            leftSection={<IconHome2 size={18} />}
                            active={isHome}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            to="/library"
                            label="Library"
                            leftSection={<IconBooks size={18} />}
                            active={isLibrary}
                            variant="light"
                        />
                        <NavLink
                            component={Link}
                            to="/narrowcast"
                            label="Narrowcast"
                            leftSection={<IconDeviceTv size={18} />}
                            variant="light"
                        />
                        {isLoggedIn && (
                            <NavLink
                                component={Link}
                                to="/account"
                                label="Account"
                                leftSection={<IconUser size={18} />}
                                active={isAccount}
                                variant="light"
                            />
                        )}
                        {isAdmin && (
                            <NavLink
                                component={Link}
                                to="/admin"
                                label="Admin"
                                leftSection={<IconShield size={18} />}
                                active={isAdminRoute}
                                variant="light"
                            />
                        )}
                        <NavLink
                            component={Link}
                            to="/bridge"
                            label="Bridge"
                            leftSection={<IconAB2 size={18} />}
                            active={isBridge}
                            variant="light"
                        />
                    </Stack>
                </ScrollArea>
            </Box>

            {/* BOTTOM ACCOUNT PANEL - each item gets its own row */}
            <Box
                px="sm"
                py="xs"
                style={{
                    borderTop: "1px solid var(--mantine-color-default-border)",
                }}
            >
                {isLoggedIn ? (
                    <Stack gap="xs">
                        {/* email */}
                        <Text size="sm" truncate>
                            {state.email}
                        </Text>

                        {/* connected badge (admin only) */}
                        {isAdmin && !loading && (
                            <Tooltip
                                withArrow
                                label={
                                    !connected
                                        ? "No recent ping from admin extension"
                                        : versionMismatch
                                            ? `Version mismatch: server ${appVersion ?? "?"}, extension ${extVersion ?? "?"}`
                                            : lastPingAt
                                                ? `Admin extension last ping: ${new Date(lastPingAt).toLocaleTimeString()}`
                                                : "Admin extension is currently pinging the API"
                                }
                                style={{ fontSize: 10 }}
                            >
                                <Badge
                                    size="xs"
                                    radius="lg"
                                    fullWidth
                                    color={
                                        !connected
                                            ? "var(--interlinked-color-suppressed)"
                                            : versionMismatch
                                                ? "var(--interlinked-color-warning)"
                                                : "var(--interlinked-color-success)"
                                    }
                                >
                                    {!connected
                                        ? "offline"
                                        : versionMismatch
                                            ? "version mismatch"
                                            : "connected"}
                                </Badge>
                            </Tooltip>
                        )}

                        {/* download button */}
                        <Tooltip
                            withArrow
                            label={`Download SyncniteBridge ${appVersion} (.pext)`}
                            style={{ fontSize: 10 }}
                        >
                            <Button
                                component="a"
                                href={API_ENDPOINTS.EXTENSION_DOWNLOAD}
                                size="xs"
                                radius="sm"
                                variant="light"
                                fullWidth
                                justify="space-between"
                                rightSection={<span />}
                                leftSection={<IconDownload size={14} />}
                            >
                                Download<br />extension
                            </Button>
                        </Tooltip>

                        {/* logout button */}
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
                                fullWidth
                                justify="space-between"
                                rightSection={<span />}
                                leftSection={<IconLogout2 size={14} />}
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
            </Box>
        </Stack>
    );
}