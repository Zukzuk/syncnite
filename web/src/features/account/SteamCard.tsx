import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Group, Stack, Text, ThemeIcon, Divider, Badge, Loader, PasswordInput } from "@mantine/core";
import { IconClock, IconLink, IconListDetails } from "@tabler/icons-react";
import { API_ENDPOINTS } from "../../constants";
import { SteamStatusResponse } from "../../types/app";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { fetchSteamStatus, syncSteamWishlist } from "../../services/SteamService";
import { InterLinkedGrid } from "../../types/interlinked";
import { getCreds } from "../../services/AccountService";
import { CustomIconSVG } from "../../components/CustomIcon";
import { TextDataRow } from "../../components/TextDataRow";
import { IconButton } from "../../components/IconButton";

type Props = {
    grid: InterLinkedGrid;
};

export default function SteamCard({ grid }: Props): JSX.Element {
    const [steamStatus, setSteamStatus] = useState<SteamStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [linking, setLinking] = useState(false);
    const [steamApiKey, setSteamApiKey] = useState("");

    // Polling wishlist via hook (similar behaviour to useLocalInstalled)
    const wishlist = useSteamWishlist({ pollMs: 3000 });
    const syncInProgress = Boolean(wishlist?.syncInProgress);

    // Initial load of Steam status (one-shot)
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoadingStatus(true);
            try {
                const statusResp = await fetchSteamStatus();
                if (!cancelled) {
                    setSteamStatus(statusResp);

                    // NEW: prefill key from saved account
                    const savedKey = String((statusResp as any)?.steam?.apiKey ?? "");
                    setSteamApiKey(savedKey);
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
        try {
            await syncSteamWishlist();
        } catch (e: any) {
            console.error("Failed to sync Steam wishlist", e);
            alert(`Failed to sync Steam wishlist: ${String(e?.message ?? e)}`);
        }
    }, []);

    const handleLinkSteam = useCallback(async () => {
        const creds = getCreds();
        if (!creds) {
            alert("You must be logged in to link Steam.");
            return;
        }

        const apiKey = steamApiKey.trim();
        if (!apiKey) {
            alert("Please enter your Steam Web API key to link Steam.");
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
                body: JSON.stringify({ apiKey }),
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
    }, [steamApiKey]);

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
                        <CustomIconSVG type="steam" />
                    </ThemeIcon>

                    <Stack gap={0}>
                        <Text fw={600}>Steam connection</Text>
                        <Text size="xs" c="dimmed">
                            Link your Steam account to sync your steam wishlist to InterLinked.
                        </Text>
                    </Stack>
                </Group>

                <Badge
                    color={
                        steamConnected || syncInProgress
                            ? "var(--interlinked-color-success)"
                            : "var(--interlinked-color-error)"
                    }
                    variant="filled"
                    size="sm"
                    style={{
                        position: "absolute",
                        top: grid.gap,
                        right: grid.gap,
                    }}
                >
                    {syncInProgress
                        ? "syncing wishlist..."
                        : steamConnected
                            ? "linked"
                            : "unlinked"}
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
                    {/* API key input */}
                    <PasswordInput
                        label="Steam Web API key"
                        description={
                            <Text size="xs" c="dimmed">
                                Required to sync your wishlist to your InterLinked account.{" "}
                                <Text
                                    component="a"
                                    href="https://steamcommunity.com/dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    c="var(--interlinked-color-primary)"
                                >
                                    Obtain your Steam Web API key here
                                </Text>
                            </Text>
                        }
                        placeholder="Paste your Steam Web API key"
                        value={steamApiKey}
                        onChange={(e) => setSteamApiKey(e.currentTarget.value)}
                        required
                        disabled={linking}
                    />

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
                            disabled={!steamApiKey || syncInProgress}
                            loading={linking}
                            text={steamConnected ? "Re-link" : "Link"}
                            label={steamConnected ? "Re-link your Steam account" : "Link your Steam account"}
                        />

                        {steamConnected && (
                            <IconButton
                                type="button"
                                onClick={handleSyncWishlist}
                                icon={<IconListDetails color="var(--interlinked-color-secondary)" size={14} />}
                                loading={syncInProgress}
                                text={syncInProgress ? "Syncing wishlist…" : "Sync wishlist now"}
                                label={"Sync your Steam wishlist items now"}
                            />
                        )}
                    </Group>
                </Stack>
            )}
        </Card>
    );
}
