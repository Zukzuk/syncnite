import * as React from "react";
import { Container, Stack, Text, Card, Group, ThemeIcon, Badge, Divider, Button, Loader, Tooltip } from "@mantine/core";
import { IconUser, IconClock, IconListDetails, IconPlugConnected, IconPlugConnectedX, IconDownload } from "@tabler/icons-react";
import { getCreds } from "../../lib/utils";
import { API_ENDPOINTS, GRID, INTERVAL_MS, WEB_APP_VERSION } from "../../lib/constants";
import { fetchSteamStatus, syncSteamWishlist } from "../../lib/api";
import type { SteamStatusResponse } from "../../types/types";
import { useAuth } from "../../hooks/useAuth";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { useExtensionStatus } from "../../hooks/useExtensionStatus";
import { TextDataRow } from "../../components/TextDataRow";
import { getTheme } from "../../theme";

export default function AccountPage(): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";

    const { isDesktop } = getTheme();

    const [steamStatus, setSteamStatus] = React.useState<SteamStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = React.useState(true);
    const [syncing, setSyncing] = React.useState(false);
    const [linking, setLinking] = React.useState(false);

    // Polling wishlist via hook (similar behaviour to useLocalInstalled)
    const wishlist = useSteamWishlist({ pollMs: 3000 });

    // Extension status via hook
    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({ pollMs: INTERVAL_MS });

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
        <Container size="sm" pt={isDesktop ? "lg" : GRID.rowHeight} pb="lg">
            <Stack gap="lg">
                {/* Page header */}
                <Stack gap={4}>
                    <Text fz={28} fw={700}>
                        My account
                    </Text>
                    <Text size="sm" c="dimmed">
                        Manage your InterLinked account and connected services.
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
                        <Badge
                            color={isAdmin ? "var(--interlinked-color-success)" : "var(--interlinked-color-suppressed)"}
                            variant="filled"
                            size="sm"
                            style={{ position: "absolute", top: GRID.gap, right: GRID.gap }}
                        >
                            {isAdmin ? "Admin" : "User"}
                        </Badge>
                    </Group>

                    <Divider my="sm" />

                    <Stack gap={4}>
                        <TextDataRow label="Email" value={state.email ?? "(unknown)"} />
                    </Stack>
                </Card>

                {/* Extension download + status */}
                <Card withBorder shadow="sm" radius="md">
                    <Group justify="space-between" align="flex-start" mb="sm">
                        <Group gap="sm">
                            <ThemeIcon radius="xl" variant="light">
                                {connected ? <IconPlugConnected size={18} /> : <IconPlugConnectedX size={18} />}
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>SyncniteBridge extension</Text>
                                <Text size="xs" c="dimmed">
                                    Download and install the Playnite extension. Admins can also see whether it’s currently connected.
                                </Text>
                            </div>
                        </Group>

                        {/* Admin-only status badge, same semantics as navbar */}
                        {isAdmin && !loading && (
                            <Tooltip
                                withArrow
                                style={{ fontSize: 10 }}
                                label={
                                    !connected
                                        ? "No recent ping from admin extension"
                                        : versionMismatch
                                            ? `Version mismatch: server ${WEB_APP_VERSION ?? "?"}, extension ${extVersion ?? "?"}`
                                            : lastPingAt
                                                ? `Admin extension last ping: ${new Date(lastPingAt).toLocaleTimeString()}`
                                                : "Admin extension is currently pinging the API"
                                }
                            >
                                <Badge
                                    color={
                                        !connected
                                            ? "var(--interlinked-color-suppressed)"
                                            : versionMismatch
                                                ? "var(--interlinked-color-warning)"
                                                : "var(--interlinked-color-success)"
                                    }
                                    variant="filled"
                                    size="sm"
                                    style={{ position: "absolute", top: GRID.gap, right: GRID.gap }}
                                >
                                    {!connected ? "offline" : versionMismatch ? "version mismatch" : "connected"}
                                </Badge>
                            </Tooltip>
                        )}
                    </Group>

                    <Divider my="sm" />

                    <Stack gap="sm">
                        <Stack gap={4}>
                            <TextDataRow label="Server version" value={`${WEB_APP_VERSION}`} />

                            {isAdmin && (
                                <>
                                    <TextDataRow
                                        label="Extension version"
                                        value={extVersion ? `v${extVersion}` : "(unknown)"}
                                    />
                                    <TextDataRow
                                        icon={<IconClock size={14} />}
                                        label="Last ping"
                                        value={lastPingAt ? new Date(lastPingAt).toLocaleString() : "(unknown)"}
                                        size="xs"
                                    />
                                </>
                            )}
                        </Stack>

                        <Group mt="xs" gap="sm">
                            <Tooltip withArrow style={{ fontSize: 10 }} label={`Download SyncniteBridge ${WEB_APP_VERSION} (.pext)`}>
                                <Button
                                    component="a"
                                    href={API_ENDPOINTS.EXTENSION_DOWNLOAD}
                                    leftSection={<IconDownload size={14} />}
                                    variant="light"
                                    size="xs"
                                >
                                    Download extension
                                </Button>
                            </Tooltip>
                        </Group>
                    </Stack>
                </Card>

                {/* Steam linking + wishlist */}
                <Card withBorder shadow="sm" radius="md">
                    <Group justify="space-between" align="flex-start" mb="sm">
                        <Group gap="sm">
                            <ThemeIcon radius="xl" variant="light">
                                {steamConnected ? <IconPlugConnected size={18} /> : <IconPlugConnectedX size={18} />}
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>Steam connection</Text>
                                <Text size="xs" c="dimmed">
                                    Link your Steam account to sync your wishlist into Syncnite.
                                </Text>
                            </div>
                        </Group>

                        {steamConnected ? (
                            <Badge
                                color="var(--interlinked-color-success)"
                                variant="filled"
                                size="sm"
                                style={{ position: "absolute", top: GRID.gap, right: GRID.gap }}
                            >
                                Linked
                            </Badge>
                        ) : (
                            <Badge
                                color="var(--interlinked-color-suppressed)"
                                variant="filled"
                                size="sm"
                                style={{ position: "absolute", top: GRID.gap, right: GRID.gap }}
                            >
                                Not linked
                            </Badge>
                        )}
                    </Group>

                    <Divider my="sm" />

                    {loadingStatus ? (
                        <Group gap="xs">
                            <Loader size="xs" type="bars" />
                            <Text size="sm" c="dimmed">
                                Loading Steam status…
                            </Text>
                        </Group>
                    ) : (
                        <Stack gap="sm">
                            {/* Connection details */}
                            {steamConnected ? (
                                <Stack gap={4}>
                                    <TextDataRow label="Linked SteamID" value={steamId || "(unknown)"} />
                                    <TextDataRow label="Wishlist items" value={wishlistCount} />
                                    <TextDataRow
                                        icon={<IconClock size={14} />}
                                        label="Linked at"
                                        value={linkedAt || "(unknown)"}
                                        size="xs"
                                    />
                                    <TextDataRow
                                        icon={<IconClock size={14} />}
                                        label="Synced at"
                                        value={lastSynced || "(never)"}
                                        size="xs"
                                    />
                                </Stack>
                            ) : (
                                <Stack gap={4}>
                                    <TextDataRow label="Status" value="Not linked" />
                                </Stack>
                            )}

                            {/* Actions */}
                            <Group mt="xs" gap="sm">
                                <Tooltip withArrow style={{ fontSize: 10 }} label={steamConnected ? "Re-link your Steam account" : "Link your Steam account"}>
                                    <Button size="xs" onClick={handleLinkSteam} loading={linking} variant={steamConnected ? "default" : "filled"}>
                                        {steamConnected ? "Re-link" : "Link"}
                                    </Button>
                                </Tooltip>

                                {steamConnected && (
                                    <Tooltip withArrow style={{ fontSize: 10 }} label={"Sync your Steam wishlist items now"}>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            onClick={handleSyncWishlist}
                                            loading={syncing}
                                            leftSection={<IconListDetails size={14} />}
                                        >
                                            {syncing ? "Syncing wishlist…" : "Sync wishlist now"}
                                        </Button>
                                    </Tooltip>
                                )}
                            </Group>
                        </Stack>
                    )}
                </Card>
            </Stack>
        </Container>
    );
}