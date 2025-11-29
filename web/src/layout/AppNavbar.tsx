
import { Link, useLocation } from "react-router-dom";
import { useMantineColorScheme, Stack, Box, Group, Text, ActionIcon, Badge, Button, Divider, ScrollArea, Tooltip, NavLink } from "@mantine/core";
import { IconSun, IconMoon, IconDownload, IconHome2, IconBooks, IconAB2, IconUser, IconShield } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useExtensionStatus } from "../hooks/useExtensionStatus";
import { API_ENDPOINTS, INTERVAL_MS } from "../lib/constants";

export function AppNavbar({ appVersion }: { appVersion: string }) {
    const location = useLocation();
    const { state, logout } = useAuth({ pollMs: 0 });
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    const { connected, lastPingAt, loading } = useExtensionStatus({ pollMs: INTERVAL_MS });

    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    return (
        <Stack h="100%" gap="xs">
            {/* BRAND / THEME SECTION */}
            <Box px="md">
                <Group justify="space-between" align="center">
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={700} size="lg" truncate>
                            Syncnite
                        </Text>
                        <Text size="xs" c="dimmed">
                            {appVersion}
                        </Text>
                    </Stack>

                    <ActionIcon
                        variant="subtle"
                        aria-label="Toggle color scheme"
                        onClick={() =>
                            setColorScheme(colorScheme === "dark" ? "light" : "dark")
                        }
                        size="md"
                    >
                        {colorScheme === "dark" ? (
                            <IconSun size={18} />
                        ) : (
                            <IconMoon size={18} />
                        )}
                    </ActionIcon>
                </Group>
            </Box>

            {/* EXTENSION SECTION */}
            <Box px="md">
                <Group justify="space-between" align="center">
                    {isAdmin && !loading && (
                        <Tooltip
                            withArrow
                            label={
                                connected
                                    ? lastPingAt
                                        ? `Admin extension last ping: ${new Date(
                                            lastPingAt
                                        ).toLocaleTimeString()}`
                                        : "Admin extension is currently pinging the API"
                                    : "No recent ping from admin extension"
                            }
                            style={{ fontSize: 10 }}
                        >
                            <Badge
                                size="xs"
                                radius="lg"
                                color={connected ? "teal" : "gray"}
                            >
                                {connected ? "connected" : "offline"}
                            </Badge>
                        </Tooltip>
                    )}
                    <Tooltip
                        withArrow
                        label={`Download SyncniteBridge v${appVersion} (.pext)`}
                        style={{ fontSize: 10 }}
                    >
                        <Button
                            component="a"
                            href={API_ENDPOINTS.EXTENSION_DOWNLOAD}
                            size="xs"
                            radius="lg"
                            leftSection={<IconDownload size={16} />}
                            variant="filled"
                            fw={200}
                        >
                            download
                        </Button>
                    </Tooltip>
                </Group>
            </Box>

            <Divider />

            {/* NAV LINKS (SCROLLABLE MIDDLE) */}
            <Box style={{ flex: 1, minHeight: 0 }}>
                <ScrollArea style={{ height: "100%" }}>
                    <NavLink
                        component={Link}
                        to="/"
                        label="Home"
                        leftSection={<IconHome2 size={18} />}
                        active={location.pathname === "/"}
                    />
                    <NavLink
                        component={Link}
                        to="/library"
                        label="Library"
                        leftSection={<IconBooks size={18} />}
                        active={location.pathname.startsWith("/library")}
                    />
                    <NavLink
                        component={Link}
                        to="/bridge"
                        label="Bridge"
                        leftSection={<IconAB2 size={18} />}
                        active={location.pathname.startsWith("/bridge")}
                    />
                    {isLoggedIn && (
                        <NavLink
                            component={Link}
                            to="/account"
                            label="Account"
                            leftSection={<IconUser size={18} />}
                            active={location.pathname.startsWith("/account")}
                        />
                    )}
                    {isAdmin && (
                        <NavLink
                            component={Link}
                            to="/admin"
                            label="Admin"
                            leftSection={<IconShield size={18} />}
                            active={location.pathname.startsWith("/admin")}
                        />
                    )}
                </ScrollArea>
            </Box>

            <Divider />

            {/* ACCOUNT / LOGOUT SECTION AT BOTTOM */}
            <Box px="md" pb="sm" pt="xs">
                {isLoggedIn ? (
                    <Group justify="space-between" gap="xs" align="center">
                        <Text size="sm" truncate>
                            {state.email}
                        </Text>
                        <Button size="xs" variant="light" onClick={logout}>
                            Logout
                        </Button>
                    </Group>
                ) : (
                    <Text size="xs" c="dimmed">
                        Not signed in
                    </Text>
                )}
            </Box>
        </Stack>
    );
}
