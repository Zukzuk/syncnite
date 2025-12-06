import * as React from "react";
import { Container, Stack, Text, Card, Group, ThemeIcon, Badge, Divider, Code, Button, Loader } from "@mantine/core";
import { IconUser, IconSteam, IconClock, IconListDetails } from "@tabler/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { getCreds } from "../../lib/utils";
import { API_ENDPOINTS } from "../../lib/constants";
import type { SteamStatusResponse } from "../../types/types";
import { fetchSteamStatus, syncSteamWishlist } from "../../lib/api";

export default function AccountPage(): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";

    const [steamStatus, setSteamStatus] = React.useState<SteamStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = React.useState(true);
    const [syncing, setSyncing] = React.useState(false);
    const [linking, setLinking] = React.useState(false);

    // Polling wishlist via hook (similar behaviour to useLocalInstalled)
    const wishlist = useSteamWishlist({ pollMs: 3000 });

    // Initial load of Steam status (one-shot)
    React.useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoadingStatus(true);
            try {
                const statusResp = await fetchSteamStatus();
                if (!cancelled) {
                    setSteamStatus(statusResp);
                }
            } finally {
                if (!cancelled) setLoadingStatus(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSyncWishlist = React.useCallback(async () => {
        setSyncing(true);
        try {
            // Starts background sync; hook will pick up changes from /steam/wishlist
            await syncSteamWishlist();
        } finally {
            setSyncing(false);
        }
    }, []);

    const handleLinkSteam = React.useCallback(async () => {
        const creds = getCreds();
        if (!creds) {
            alert("You must be logged in to link Steam.");
            return;
        }

        setLinking(true);
        try {
            const resp = await fetch(API_ENDPOINTS.STEAM_AUTH_START, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-email": creds.email,
                    "x-auth-password": creds.password,
                },
            });

            if (!resp.ok) {
                const body = await resp.json().catch(() => null);
                const msg = body?.error || `HTTP ${resp.status}`;
                throw new Error(msg);
            }

            const json = await resp.json();
            const redirectUrl = json?.redirectUrl;
            if (!redirectUrl || typeof redirectUrl !== "string") {
                throw new Error("Missing redirectUrl from server");
            }

            // Full-page redirect to Steam OpenID login
            window.location.href = redirectUrl;
        } catch (e: any) {
            console.error("Failed to start Steam linking", e);
            alert(`Failed to start Steam linking: ${String(e?.message ?? e)}`);
            setLinking(false);
        }
    }, []);

    const steamConnected = !!steamStatus?.connected;
    const steamId = steamStatus?.steam?.steamId ?? null;
    const linkedAt = steamStatus?.steam?.linkedAt ?? null;

    const wishlistCount = wishlist?.items?.length ?? 0;
    const lastSynced = wishlist?.lastSynced ?? null;

    return (
        <Container size="sm" py="lg">
            <Stack gap="lg">
                {/* Page header */}
                <Stack gap={4}>
                    <Text fz={28} fw={700}>
                        My account
                    </Text>
                    <Text size="sm" c="dimmed">
                        Manage your Syncnite account and link your Steam wishlist.
                    </Text>
                </Stack>

                {/* Account info */}
                <Card withBorder shadow="sm" radius="md">
                    <Group justify="space-between" align="flex-start" mb="sm">
                        <Group gap="sm">
                            <ThemeIcon radius="xl" variant="light">
                                <IconUser size={18} />
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>Account</Text>
                                <Text size="xs" c="dimmed">
                                    Basic information about your Syncnite login.
                                </Text>
                            </div>
                        </Group>
                        <Badge color={isAdmin ? "green" : "gray"} variant="filled">
                            {isAdmin ? "Admin" : "User"}
                        </Badge>
                    </Group>

                    <Divider my="sm" />

                    <Stack gap="xs">
                        <Group gap="xs">
                            <Text size="sm" c="dimmed" fw={500}>
                                Email
                            </Text>
                            <Code>{state.email ?? "(unknown)"}</Code>
                        </Group>
                    </Stack>
                </Card>

                {/* Steam linking + wishlist */}
                <Card withBorder shadow="sm" radius="md">
                    <Group justify="space-between" align="flex-start" mb="sm">
                        <Group gap="sm">
                            <ThemeIcon radius="xl" variant="light" color="dark">
                                <IconSteam size={18} />
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>Steam connection</Text>
                                <Text size="xs" c="dimmed">
                                    Link your Steam account to sync your wishlist into Syncnite.
                                </Text>
                            </div>
                        </Group>

                        {steamConnected ? (
                            <Badge color="green" variant="filled">
                                Linked
                            </Badge>
                        ) : (
                            <Badge color="gray">Not linked</Badge>
                        )}
                    </Group>

                    <Divider my="sm" />

                    {loadingStatus ? (
                        <Group gap="xs">
                            <Loader size="xs" />
                            <Text size="sm" c="dimmed">
                                Loading Steam status…
                            </Text>
                        </Group>
                    ) : (
                        <Stack gap="sm">
                            {/* Connection details */}
                            {steamConnected ? (
                                <Stack gap={4}>
                                    <Group gap="xs">
                                        <Text size="sm" c="dimmed" fw={500}>
                                            SteamID
                                        </Text>
                                        <Code>{steamId || "(unknown)"}</Code>
                                    </Group>
                                    <Group gap="xs">
                                        <IconClock size={14} />
                                        <Text size="xs" c="dimmed">
                                            Linked at <Code>{linkedAt || "(unknown)"}</Code>
                                        </Text>
                                    </Group>
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">
                                    No Steam account linked yet. Click{" "}
                                    <Text span fw={500}>
                                        Link Steam account
                                    </Text>{" "}
                                    to sign in with Steam and connect your wishlist.
                                </Text>
                            )}

                            {/* Actions */}
                            <Group mt="xs" gap="sm">
                                <Button
                                    size="xs"
                                    onClick={handleLinkSteam}
                                    loading={linking}
                                    variant={steamConnected ? "default" : "filled"}
                                >
                                    {steamConnected ? "Re-link Steam account" : "Link Steam account"}
                                </Button>

                                {steamConnected && (
                                    <Button
                                        size="xs"
                                        variant="light"
                                        onClick={handleSyncWishlist}
                                        loading={syncing}
                                        leftSection={<IconListDetails size={14} />}
                                    >
                                        {syncing ? "Syncing wishlist…" : "Sync wishlist now"}
                                    </Button>
                                )}
                            </Group>

                            {/* Wishlist info */}
                            {steamConnected && (
                                <Group gap="xs" mt="xs">
                                    <Text size="xs" c="dimmed">
                                        Wishlist items saved:{" "}
                                        <Text span fw={600}>
                                            {wishlistCount}
                                        </Text>
                                        {lastSynced && (
                                            <>
                                                {" • "}
                                                Last synced: <Code>{lastSynced}</Code>
                                            </>
                                        )}
                                    </Text>
                                </Group>
                            )}
                        </Stack>
                    )}
                </Card>
            </Stack>
        </Container>
    );
}