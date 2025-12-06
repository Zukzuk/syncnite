import React from "react";
import { fetchExtensionStatus } from "../lib/api";
import { useAuth } from "./useAuth";
import { INTERVAL_MS, EXT_STATE_DEFAULTS } from "../lib/constants";

type UseParams = {
    pollMs?: number;
};

type UseReturn = {
    connected: boolean;
    lastPingAt: string | null;
    loading: boolean;
    versionMismatch: boolean;
    extVersion: string | null;
};

// A hook to monitor the status of the browser extension.
export function useExtensionStatus({ pollMs = INTERVAL_MS }: UseParams): UseReturn {
    const { state } = useAuth({ pollMs: 0 });
    const EXT_STATE_DEFAULTS = {
        connected: false,
        lastPingAt: null as string | null,
        loading: true,
        versionMismatch: false,
        extVersion: null as string | null,
    };

    const [status, setStatus] = React.useState<UseReturn>(EXT_STATE_DEFAULTS);

    const isAdmin = state.loggedIn && state.role === "admin";

    React.useEffect(() => {
        if (!isAdmin) {
            setStatus(EXT_STATE_DEFAULTS);
            return;
        }

        let cancelled = false;

        async function tick() {
            try {
                const r = await fetchExtensionStatus();
                if (!cancelled) {
                    setStatus({
                        connected: !!r.connected,
                        lastPingAt: r.lastPingAt,
                        loading: false,
                        versionMismatch: !!r.versionMismatch,
                        extVersion: r.extVersion ?? null,
                    });
                }
            } catch {
                if (!cancelled) {
                    setStatus((prev) => ({
                        ...prev,
                        connected: false,
                        loading: false,
                        versionMismatch: false,
                        extVersion: prev.extVersion,
                    }));
                }
            }
        }

        // initial
        void tick();

        // poll
        const t = window.setInterval(tick, pollMs);
        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, [isAdmin, pollMs]);

    return status;
}