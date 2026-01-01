import { useCallback, useEffect, useState } from "react";
import { Group } from "@mantine/core";
import { IconUserHexagon } from "@tabler/icons-react";
import { API_ENDPOINTS, INTERVAL_MS, WEB_APP_VERSION } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { useExtensionStatus } from "../../hooks/useExtensionStatus";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { fetchSteamStatus } from "../../services/SteamService";
import { getCreds } from "../../services/AccountService";
import { ControlPanelTile } from "./components/ControlPanelTile";
import { CustomIconSVG } from "../../components/CustomIcon";
import { IconThemeSwitch } from "../../components/IconThemeSwitch";
import { SteamStatusResponse } from "../../types/steam";

type Props = {
    desktopMini?: boolean;
    toggleNavbar?: () => void;
}

export function ControlPanel({ desktopMini = false, toggleNavbar }: Props): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });

    // User
    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    const accountDot = !isLoggedIn
        ? "var(--interlinked-color-error)"
        : "var(--interlinked-color-success)";

    const accountTip = !isLoggedIn
        ? "Account: not signed in"
        : `Account: signed in as ${state.email ?? "(unknown)"} (${isAdmin ? "admin" : "user"})`;

    // Playnite
    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({
        pollMs: INTERVAL_MS,
    });

    const bridgeDot = !isLoggedIn || loading || !connected
        ? "var(--interlinked-color-error)"
        : versionMismatch
            ? "var(--interlinked-color-warning)"
            : "var(--interlinked-color-success)";


    const bridgeTip = !isLoggedIn
        ? "Playnite: sign in to see status"
        : loading
            ? "Playnite: checking status..."
            : !connected
                ? "Playnite: offline (no recent ping)"
                : versionMismatch
                    ? `Playnite: version mismatch (server ${WEB_APP_VERSION ?? "?"}, extension ${extVersion ?? "?"})`
                    : lastPingAt
                        ? `Playnite: linked (last ping ${new Date(lastPingAt).toLocaleTimeString()})`
                        : "Playnite: linked";

    // Steam
    const [steamStatus, setSteamStatus] = useState<SteamStatusResponse | null>(null);
    const [loadingSteam, setLoadingSteam] = useState(false);
    const wishlist = useSteamWishlist({ pollMs: 3000 });
    const wishlistCount = wishlist?.items?.length ?? 0;
    const lastSynced = wishlist?.lastSynced ?? null;

    useEffect(() => {
        let cancelled = false;

        async function loadSteam() {
            if (!isLoggedIn) return;
            setLoadingSteam(true);
            try {
                const resp = await fetchSteamStatus();
                if (!cancelled) setSteamStatus(resp);
            } finally {
                if (!cancelled) setLoadingSteam(false);
            }
        }

        void loadSteam();
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn]);

    const steamConnected = !!steamStatus?.connected;
    const steamDot = !isLoggedIn || loadingSteam || !steamConnected
        ? "var(--interlinked-color-error)"
        : "var(--interlinked-color-success)";

    const steamTip = !isLoggedIn
        ? "Steam: sign in to link your account"
        : loadingSteam
            ? "Steam: loading status..."
            : steamConnected
                ? `Steam: linked (wishlist ${wishlistCount}${lastSynced ? `, last synced ${lastSynced}` : ""})`
                : "Steam: not linked";

    // Plex
    const [plexStatus, setPlexStatus] = useState<PlexStatusResponse | null>(null);
    const [loadingPlex, setLoadingPlex] = useState(true);

    const authHeaders = useCallback(() => {
        const creds = getCreds();
        if (!creds) return null;

        return {
            "Content-Type": "application/json",
            "x-auth-email": creds.email,
            "x-auth-password": creds.password,
        };
    }, []);

    const loadPlexStatus = useCallback(async () => {
        const headers = authHeaders();
        if (!headers) {
            setPlexStatus({ ok: true, connected: false });
            setLoadingPlex(false);
            return;
        }

        setLoadingPlex(true);
        try {
            const resp = await fetch(API_ENDPOINTS.PLEX_STATUS, { method: "GET", headers });
            const json = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);

            setPlexStatus(json as PlexStatusResponse);
        } catch (e) {
            console.error("Failed to load Plex status (ControlPanel)", e);
            setPlexStatus({ ok: true, connected: false });
        } finally {
            setLoadingPlex(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        void loadPlexStatus();
    }, [loadPlexStatus]);

    const plexConnected = !!plexStatus?.connected;

    const plexDot =
        !isLoggedIn || loadingPlex || !plexConnected
            ? "var(--interlinked-color-error)"
            : "var(--interlinked-color-success)";

    const plexTip = !isLoggedIn
        ? "Plex: sign in to link your server"
        : loadingPlex
            ? "Plex: loading status..."
            : plexConnected
                ? `Plex: linked${plexStatus?.lastSyncedAt ? ` (last synced ${plexStatus.lastSyncedAt})` : ""}`
                : "Plex: not linked";

    // Theme
    const themeTip = "Theme: toggle light/dark mode";

    return (
        <Group gap={8} wrap="wrap" justify={desktopMini ? "center" : "flex-start"}>
            <ControlPanelTile
                tooltip={accountTip}
                dotColor={accountDot}
                icon={<IconUserHexagon size={18} />}
                toggleNavbar={toggleNavbar}
            />
            <ControlPanelTile
                tooltip={bridgeTip}
                dotColor={bridgeDot}
                icon={<CustomIconSVG type="playnite" />}
                toggleNavbar={toggleNavbar}
            />
            <ControlPanelTile
                tooltip={steamTip}
                dotColor={steamDot}
                icon={<CustomIconSVG type="steam" />}
                toggleNavbar={toggleNavbar}
            />
            <ControlPanelTile
                tooltip={plexTip}
                dotColor={plexDot}
                icon={<CustomIconSVG type="plex" />}
                toggleNavbar={toggleNavbar}
            />
            <ControlPanelTile
                tooltip={themeTip}
                compIcon={<IconThemeSwitch actionSize={38} />}
            />
        </Group>
    );
}
