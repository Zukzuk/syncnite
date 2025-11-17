import { Group, Title, ActionIcon, Button, Tooltip, Burger, Text, useMantineColorScheme, Badge } from "@mantine/core";
import { IconDownload, IconMoon, IconSun } from "@tabler/icons-react";
import { API_ENDPOINTS } from "../lib/constants";
import { useAuth } from "../hooks/useAuth";
import { useExtensionStatus } from "../hooks/useExtensionStatus";

const appVersion = (window as any).__APP_VERSION__ ?? 'dev';

type Props = {
    opened: boolean;
    onToggleNav: () => void;
}

export function AppHeader({ opened, onToggleNav }: Props) {
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const { state, logout } = useAuth({ pollMs: 0 });
    const { connected, lastPingAt, loading } = useExtensionStatus(10_000);

    const isAdmin = state.loggedIn && state.role === "admin";

    return (
        <Group h="100%" px="md" justify="space-between">
            <Group>
                {/* Hamburger menu for mobile */}
                <Burger opened={opened} onClick={onToggleNav} hiddenFrom="sm" size="sm" />
                <Title order={3}>Syncnite</Title>
            </Group>

            <Group gap="sm">
                {/* Download extension button */}
                <Tooltip
                    withArrow
                    label={`Download SyncniteBridge v${appVersion} (.pext)`}
                    style={{ fontSize: 10 }}
                >
                    <Button
                        component="a"
                        href={API_ENDPOINTS.EXTENSION_DOWNLOAD}
                        size="xs"
                        radius="md"
                        leftSection={<IconDownload size={16} />}
                        variant="filled"
                        fw={600}
                    >
                        Playnite extension
                    </Button>
                </Tooltip>

                {/* User logout */}
                <Group gap="sm">
                    {state.loggedIn ? (
                        <>
                            <Button size="xs" variant="light" onClick={logout}>Logout</Button>
                            <Text size="xs" className="is-dim">{state.email}</Text>
                        </>
                    ) : null}
                </Group>

                {/* User role badge */}
                {isAdmin && !loading && (
                    <Tooltip
                        withArrow
                        label={
                            connected
                                ? lastPingAt
                                    ? `Admin extension last ping: ${new Date(lastPingAt).toLocaleTimeString()}`
                                    : "Admin extension is currently pinging the API"
                                : "No recent ping from admin extension"
                        }
                        style={{ fontSize: 10 }}
                    >
                        <Badge
                            size="sm"
                            radius="md"
                            color={connected ? "teal" : "gray"}
                        >
                            {connected ? "connected" : "offline"}
                        </Badge>
                    </Tooltip>
                )}

                {/* Dark / light toggle */}
                <ActionIcon
                    variant="subtle"
                    aria-label="Toggle color scheme"
                    onClick={() =>
                        setColorScheme(colorScheme === "dark" ? "light" : "dark")
                    }
                    size="lg"
                >
                    {colorScheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
            </Group>
        </Group>
    );
}
