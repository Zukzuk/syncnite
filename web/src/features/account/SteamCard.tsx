import { useAuth } from "../../hooks/useAuth";
import { Stack, Text, Card, Group, ThemeIcon, Badge, Divider, Button, Tooltip, Loader } from "@mantine/core";
import { IconClock, IconLink, IconListDetails } from "@tabler/icons-react";
import { useInterLinkedTheme } from "../../hooks/useInterLinkedTheme";
import { API_ENDPOINTS } from "../../constants";
import { TextDataRow } from "../../components/TextDataRow";
import { getCreds } from "../../services/AccountService";
import { useCallback, useEffect, useState } from "react";
import { fetchSteamStatus, syncSteamWishlist } from "../../services/SteamService";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { SteamStatusResponse } from "../../types/types";
import { IconButton } from "../../components/IconButton";
import { CustomIconSVG } from "../../components/CustomIcon";

export default function SteamCard(): JSX.Element {
    const { grid } = useInterLinkedTheme();

    const [steamStatus, setSteamStatus] = useState<SteamStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [linking, setLinking] = useState(false);

    // Polling wishlist via hook (similar behaviour to useLocalInstalled)
    const wishlist = useSteamWishlist({ pollMs: 3000 });

    // Initial load of Steam status (one-shot)
    useEffect(() => {
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

    const handleSyncWishlist = useCallback(async () => {
        setSyncing(true);
        try {
            // Starts background sync; hook will pick up changes from /steam/wishlist
            await syncSteamWishlist();
        } finally {
            setSyncing(false);
        }
    }, []);

    const handleLinkSteam = useCallback(async () => {
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
        <Card withBorder shadow="sm" radius="md">
            <Group justify="space-between" align="flex-start" mb="sm">

                <Group gap={grid.gap * 2}>
                    <ThemeIcon radius="xl" variant="light">
                        <CustomIconSVG type="steampowered" />
                    </ThemeIcon>

                    <Stack gap={0}>
                        <Text fw={600}>Steam connection</Text>
                        <Text size="xs" c="dimmed">
                            Link your Steam account to sync your steam wishlist to InterLinked.
                        </Text>
                    </Stack>
                </Group>

                <Badge
                    color={steamConnected
                        ? "var(--interlinked-color-success)"
                        : "var(--interlinked-color-error)"}
                    variant="filled"
                    size="sm"
                    style={{
                        position: "absolute",
                        top: grid.gap,
                        right: grid.gap
                    }}
                >
                    {steamConnected
                        ? "Linked"
                        : "Not linked"
                    }
                </Badge>
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
                        <IconButton
                            type="button"
                            onClick={handleLinkSteam}
                            icon={<IconLink color="var(--interlinked-color-secondary)" size={14} />}
                            loading={linking} 
                            text={steamConnected ? "Re-link" : "Link"}
                            label={steamConnected ? "Re-link your Steam account" : "Link your Steam account"}
                        />

                        {steamConnected && (
                            <IconButton
                                type="button"
                                onClick={handleSyncWishlist}
                                icon={<IconListDetails color="var(--interlinked-color-secondary)" size={14} />}
                                loading={syncing}
                                text={syncing ? "Syncing wishlist…" : "Sync wishlist now"}
                                label={"Sync your Steam wishlist items now"}
                            />
                        )}
                    </Group>
                </Stack>
            )}
        </Card>
    );
}