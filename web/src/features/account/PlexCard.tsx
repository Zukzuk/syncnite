import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card, Divider, Group, Loader, Stack, Text, ThemeIcon, TextInput } from "@mantine/core";
import { IconClock, IconLink, IconPlugOff, IconRefresh } from "@tabler/icons-react";
import { API_ENDPOINTS } from "../../constants";
import { getCreds } from "../../services/AccountService";
import { InterLinkedGrid } from "../../types/interlinked";
import { CustomIconSVG } from "../../components/CustomIcon";
import { TextDataRow } from "../../components/TextDataRow";
import { IconButton } from "../../components/IconButton";

type Props = {
    grid: InterLinkedGrid;
};

type PlexStatusResponse = {
    ok: true;
    connected: boolean;
    serverUrl?: string;
    linkedAt?: string | null;
    lastSyncedAt?: string | null;
    lastSyncOk?: boolean | null;
    lastSyncError?: string | null;
};

export default function PlexCard({ grid }: Props): JSX.Element {
    const [status, setStatus] = useState<PlexStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    const [serverUrl, setServerUrl] = useState("");
    const [linking, setLinking] = useState(false);
    const [polling, setPolling] = useState(false);

    const [pinId, setPinId] = useState<number | null>(null);
    const [authUrl, setAuthUrl] = useState<string | null>(null);

    const [syncing, setSyncing] = useState(false);

    // avoid overlapping poll calls
    const pollInFlight = useRef(false);

    const plexConnected = !!status?.connected;

    const badgeText = useMemo(() => {
        if (syncing) return "syncing…";
        if (polling) return "linking…";
        return plexConnected ? "linked" : "unlinked";
    }, [plexConnected, polling, syncing]);

    const badgeColor = useMemo(() => {
        if (plexConnected || syncing) return "var(--interlinked-color-success)";
        return "var(--interlinked-color-error)";
    }, [plexConnected, syncing]);

    const authHeaders = useCallback(() => {
        const creds = getCreds();
        if (!creds) return null;

        return {
            "Content-Type": "application/json",
            "x-auth-email": creds.email,
            "x-auth-password": creds.password,
        };
    }, []);

    const loadStatus = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) {
            setStatus({ ok: true, connected: false });
            setLoadingStatus(false);
            return;
        }

        setLoadingStatus(true);
        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_STATUS, { method: "GET", headers });
            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            setStatus(json as PlexStatusResponse);

            // prefill server url if known
            const savedUrl = String((json as any)?.serverUrl ?? "");
            if (savedUrl) setServerUrl(savedUrl);
        } catch (e: any) {
            // keep UI usable even if status fails
            console.error("Failed to load Plex status", e);
            setStatus({ ok: true, connected: false });
        } finally {
            setLoadingStatus(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        void loadStatus();
    }, [loadStatus]);

    const startLink = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) {
            alert("You must be logged in to link Plex.");
            return;
        }

        const url = serverUrl.trim();
        if (!url) {
            alert("Please enter your Plex server URL (including http/https).");
            return;
        }

        setLinking(true);
        setAuthUrl(null);
        setPinId(null);

        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_AUTH_START, {
                method: "POST",
                headers,
                body: JSON.stringify({ serverUrl: url }),
            });

            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            const nextAuthUrl = String(json?.authUrl ?? "");
            const nextPinId = Number(json?.pinId ?? 0);

            if (!nextAuthUrl || !nextPinId) throw new Error("Missing authUrl/pinId from server");

            setAuthUrl(nextAuthUrl);
            setPinId(nextPinId);

            // open Plex auth immediately
            window.open(nextAuthUrl, "_blank", "noopener,noreferrer");

            setPolling(true);
        } catch (e: any) {
            console.error("Failed to start Plex linking", e);
            alert(`Failed to start Plex linking: ${String(e?.message ?? e)}`);
            setPolling(false);
        } finally {
            setLinking(false);
        }
    }, [authHeaders, serverUrl]);

    const pollOnce = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) return;

        if (!pinId) return;
        if (pollInFlight.current) return;

        pollInFlight.current = true;
        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_AUTH_POLL, {
                method: "POST",
                headers,
                body: JSON.stringify({ pinId }),
            });

            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            const linked = Boolean(json?.linked);
            if (linked) {
                setPolling(false);
                setPinId(null);
                setAuthUrl(null);
                await loadStatus();
            }
        } catch (e) {
            // polling errors shouldn’t spam the user; keep trying
            console.warn("Plex poll failed", e);
        } finally {
            pollInFlight.current = false;
        }
    }, [authHeaders, pinId, loadStatus]);

    useEffect(() => {
        if (!polling) return;

        const t = setInterval(() => {
            void pollOnce();
        }, 2000);

        return () => clearInterval(t);
    }, [polling, pollOnce]);

    const unlink = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) return;

        if (!confirm("Unlink Plex from your InterLinked account?")) return;

        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_UNLINK, { method: "POST", headers });
            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            setPolling(false);
            setPinId(null);
            setAuthUrl(null);
            await loadStatus();
        } catch (e: any) {
            console.error("Failed to unlink Plex", e);
            alert(`Failed to unlink Plex: ${String(e?.message ?? e)}`);
        }
    }, [authHeaders, loadStatus]);

    const sync = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) return;

        setSyncing(true);
        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_SYNC, { method: "POST", headers });
            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            await loadStatus();
        } catch (e: any) {
            console.error("Failed to sync Plex", e);
            alert(`Failed to sync Plex: ${String(e?.message ?? e)}`);
        } finally {
            setSyncing(false);
        }
    }, [authHeaders, loadStatus]);

    return (
        <Card withBorder shadow="sm" radius="md">
            <Group justify="space-between" align="flex-start" mb="sm">
                <Group gap={grid.gap * 2}>
                    <ThemeIcon radius="xl" variant="light">
                        <CustomIconSVG type="plex" />
                    </ThemeIcon>

                    <Stack gap={0}>
                        <Text fw={600}>Plex connection</Text>
                        <Text size="xs" c="dimmed">
                            Link Plex to sync your movie/series libraries into InterLinked.
                        </Text>
                    </Stack>
                </Group>

                <Badge
                    color={badgeColor}
                    variant="filled"
                    size="sm"
                    style={{ position: "absolute", top: grid.gap, right: grid.gap }}
                >
                    {badgeText}
                </Badge>
            </Group>

            <Divider my="sm" />

            {loadingStatus ? (
                <Group gap="xs">
                    <Loader size="xs" type="bars" />
                    <Text size="sm" c="dimmed">
                        Loading Plex status…
                    </Text>
                </Group>
            ) : (
                <Stack gap="sm">
                    <TextInput
                        label="Plex server URL"
                        description={
                            <Text size="xs" c="dimmed">
                                Example: <code>http://192.168.1.10:32400</code> or <code>https://plex.yourdomain.tld:32400</code>
                            </Text>
                        }
                        placeholder="http(s)://host:32400"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.currentTarget.value)}
                        disabled={linking || polling || syncing}
                    />

                    {plexConnected ? (
                        <Stack gap={4}>
                            <TextDataRow label="Server" value={status?.serverUrl ?? serverUrl ?? "(unknown)"} />
                            <TextDataRow
                                icon={<IconClock size={14} />}
                                label="Linked at"
                                value={status?.linkedAt ?? "(unknown)"}
                                size="xs"
                            />
                            <TextDataRow
                                icon={<IconClock size={14} />}
                                label="Last synced"
                                value={status?.lastSyncedAt ?? "(never)"}
                                size="xs"
                            />
                            <TextDataRow
                                label="Last sync"
                                value={
                                    status?.lastSyncOk == null
                                        ? "(unknown)"
                                        : status.lastSyncOk
                                            ? "OK"
                                            : `Failed: ${status?.lastSyncError ?? "(unknown error)"}`
                                }
                                size="xs"
                            />
                        </Stack>
                    ) : (
                        <Stack gap={4}>
                            <TextDataRow label="Status" value={polling ? "Waiting for Plex authorization…" : "Not linked"} />
                            {authUrl && (
                                <Text size="xs" c="dimmed">
                                    If the Plex login tab didn’t open,{" "}
                                    <Text
                                        component="a"
                                        href={authUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        c="var(--interlinked-color-primary)"
                                    >
                                        click here to continue linking
                                    </Text>
                                    .
                                </Text>
                            )}
                        </Stack>
                    )}

                    <Group mt="xs" gap="sm">
                        {!plexConnected ? (
                            <>
                                <IconButton
                                    type="button"
                                    onClick={startLink}
                                    icon={<IconLink color="var(--interlinked-color-secondary)" size={14} />}
                                    loading={linking}
                                    disabled={!serverUrl.trim() || syncing}
                                    text={polling ? "Linking…" : "Link"}
                                    label="Link your Plex server"
                                />

                                {polling && (
                                    <IconButton
                                        type="button"
                                        onClick={() => void pollOnce()}
                                        icon={<IconRefresh color="var(--interlinked-color-secondary)" size={14} />}
                                        loading={false}
                                        text="Poll now"
                                        label="Poll Plex PIN status now"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <IconButton
                                    type="button"
                                    onClick={sync}
                                    icon={<IconRefresh color="var(--interlinked-color-secondary)" size={14} />}
                                    loading={syncing}
                                    text={syncing ? "Syncing…" : "Sync now"}
                                    label="Sync Plex libraries now"
                                />

                                <IconButton
                                    type="button"
                                    onClick={unlink}
                                    icon={<IconPlugOff color="var(--interlinked-color-secondary)" size={14} />}
                                    text="Unlink"
                                    label="Unlink Plex"
                                    disabled={syncing}
                                />
                            </>
                        )}
                    </Group>
                </Stack>
            )}
        </Card>
    );
}
