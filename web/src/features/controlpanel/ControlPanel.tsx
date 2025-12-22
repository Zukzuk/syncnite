import { useEffect, useState } from "react";
import { Group } from "@mantine/core";
import { IconUserHexagon } from "@tabler/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { useExtensionStatus } from "../../hooks/useExtensionStatus";
import { useSteamWishlist } from "../../hooks/useSteamWishlist";
import { fetchSteamStatus } from "../../services/SteamService";
import { INTERVAL_MS, WEB_APP_VERSION } from "../../constants";
import type { SteamStatusResponse } from "../../types/app";
import { IconThemeSwitch } from "../../components/IconThemeSwitch";
import { ControlPanelTile } from "./components/ControlPanelTile";
import { CustomIconSVG } from "../../components/CustomIcon";

type Props = {
    desktopMini?: boolean;
    toggleNavbar?: () => void;
}

export function ControlPanel({ desktopMini = false, toggleNavbar }: Props): JSX.Element {
    const { state } = useAuth({ pollMs: 0 });
    const isAdmin = state.role === "admin";
    const isLoggedIn = state.loggedIn;

    const { connected, lastPingAt, loading, versionMismatch, extVersion } = useExtensionStatus({
        pollMs: INTERVAL_MS,
    });

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

    // Determine indicator colors

    const accountDot = !isLoggedIn
        ? "var(--interlinked-color-error)"
        : "var(--interlinked-color-success)";

    const bridgeDot = !isLoggedIn || loading || !connected
        ? "var(--interlinked-color-error)"
        : versionMismatch
            ? "var(--interlinked-color-warning)"
            : "var(--interlinked-color-success)";
    
    const steamConnected = !!steamStatus?.connected;
    const steamDot = !isLoggedIn || loadingSteam || !steamConnected
        ? "var(--interlinked-color-error)"
        : "var(--interlinked-color-success)";

    // Tooltips

    const accountTip = !isLoggedIn
        ? "Account: not signed in"
        : `Account: signed in as ${state.email ?? "(unknown)"} (${isAdmin ? "admin" : "user"})`;

    const bridgeTip = !isLoggedIn
        ? "Playnite: sign in to see status"
        : loading
            ? "Playnite: checking status..."
            : !connected
                ? "Playnite: offline (no recent ping)"
                : versionMismatch
                    ? `Playnite: version mismatch (server ${WEB_APP_VERSION ?? "?"}, extension ${extVersion ?? "?"})`
                    : lastPingAt
                        ? `Playnite: connected (last ping ${new Date(lastPingAt).toLocaleTimeString()})`
                        : "Playnite: connected";

    const steamTip = !isLoggedIn
        ? "Steam: sign in to link your account"
        : loadingSteam
            ? "Steam: loading status..."
            : steamConnected
                ? `Steam: linked (wishlist ${wishlistCount}${lastSynced ? `, last synced ${lastSynced}` : ""})`
                : "Steam: not linked";

    const themeTip = "Theme: toggle light/dark mode";

    return (
        <Group gap={8} wrap="wrap" justify={desktopMini ? "center" : "flex-start"}>
            <ControlPanelTile tooltip={accountTip} dotColor={accountDot} icon={<IconUserHexagon size={18} />} toggleNavbar={toggleNavbar} />
            <ControlPanelTile tooltip={bridgeTip} dotColor={bridgeDot} icon={<CustomIconSVG type="playnite" />} toggleNavbar={toggleNavbar} />
            <ControlPanelTile tooltip={steamTip} dotColor={steamDot} icon={<CustomIconSVG type="steam" />} toggleNavbar={toggleNavbar}  />
            <ControlPanelTile tooltip={themeTip} compIcon={<IconThemeSwitch actionSize={38} />} />
        </Group>
    );
}
