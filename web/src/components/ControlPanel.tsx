import * as React from "react";
import { Group } from "@mantine/core";
import { IconUser, IconPlugConnected, IconPlugConnectedX, IconBrandSteam } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useExtensionStatus } from "../hooks/useExtensionStatus";
import { useSteamWishlist } from "../hooks/useSteamWishlist";
import { fetchSteamStatus } from "../lib/api";
import { INTERVAL_MS, WEB_APP_VERSION } from "../lib/constants";
import type { SteamStatusResponse } from "../types/types";
import { IconThemeSwitch } from "./IconThemeSwitch";
import { ControlPanelTile } from "./ControlPanelTile";

type Props = {
    toggleNavbar?: () => void;
}

export function ControlPanel({ toggleNavbar }: Props): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({
        pollMs: INTERVAL_MS,
    });

    const [steamStatus, setSteamStatus] = React.useState<SteamStatusResponse | null>(null);
    const [loadingSteam, setLoadingSteam] = React.useState(false);

    const wishlist = useSteamWishlist({ pollMs: 3000 });
    const wishlistCount = wishlist?.items?.length ?? 0;
    const lastSynced = wishlist?.lastSynced ?? null;

    React.useEffect(() => {
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

    const accountDot = !isLoggedIn
        ? "var(--interlinked-color-suppressed)"
        : isAdmin
            ? "var(--interlinked-color-success)"
            : "var(--interlinked-color-suppressed)";

    const bridgeDot = !isLoggedIn || loading || !connected
        ? "var(--interlinked-color-suppressed)"
        : versionMismatch
            ? "var(--interlinked-color-warning)"
            : "var(--interlinked-color-success)";

    const steamDot = !isLoggedIn || loadingSteam || !steamConnected
        ? "var(--interlinked-color-suppressed)"
        : "var(--interlinked-color-success)";

    const accountTip = !isLoggedIn
        ? "Account: not signed in"
        : `Account: signed in as ${state.email ?? "(unknown)"} (${isAdmin ? "admin" : "user"})`;

    const bridgeTip = !isLoggedIn
        ? "SyncniteBridge: sign in to see status"
        : loading
            ? "SyncniteBridge: checking status…"
            : !connected
                ? "SyncniteBridge: offline (no recent ping)"
                : versionMismatch
                    ? `SyncniteBridge: version mismatch (server ${WEB_APP_VERSION ?? "?"}, extension ${extVersion ?? "?"})`
                    : lastPingAt
                        ? `SyncniteBridge: connected (last ping ${new Date(lastPingAt).toLocaleTimeString()})`
                        : "SyncniteBridge: connected";

    const steamTip = !isLoggedIn
        ? "Steam: sign in to link your account"
        : loadingSteam
            ? "Steam: loading status…"
            : steamConnected
                ? `Steam: linked (wishlist ${wishlistCount}${lastSynced ? `, last synced ${lastSynced}` : ""})`
                : "Steam: not linked";

    const themeTip = "Theme: toggle light/dark mode";

    const bridgeIcon =
        !isLoggedIn || loading || !connected ? (
            <IconPlugConnectedX size={18} />
        ) : versionMismatch ? (
            <IconPlugConnectedX size={18} />
        ) : (
            <IconPlugConnected size={18} />
        );

    return (
        <Group gap={8} wrap="wrap">
            <ControlPanelTile tooltip={accountTip} dotColor={accountDot} icon={<IconUser size={18} />} toggleNavbar={toggleNavbar} />
            <ControlPanelTile tooltip={bridgeTip} dotColor={bridgeDot} icon={bridgeIcon} toggleNavbar={toggleNavbar} />
            <ControlPanelTile tooltip={steamTip} dotColor={steamDot} icon={<IconBrandSteam size={18}/>} toggleNavbar={toggleNavbar}  />
            <ControlPanelTile tooltip={themeTip} compIcon={<IconThemeSwitch />} />
        </Group>
    );
}
