import React from "react";
import { fetchExtensionStatus } from "../lib/api";
import { useAuth } from "./useAuth";
import { INTERVAL_MS } from "../lib/constants";

const DEFAULT_STATE = {
    connected: false,
    lastPingAt: null as string | null,
    loading: true,
};

export function useExtensionStatus(pollMs: number = INTERVAL_MS) {
    const { state } = useAuth({ pollMs: 0 });
    const [status, setStatus] = React.useState(DEFAULT_STATE);

    const isAdmin = state.loggedIn && state.role === "admin";

    React.useEffect(() => {
        if (!isAdmin) {
            setStatus(DEFAULT_STATE);
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
                    });
                }
            } catch {
                if (!cancelled) {
                    setStatus((prev) => ({ ...prev, connected: false, loading: false }));
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
