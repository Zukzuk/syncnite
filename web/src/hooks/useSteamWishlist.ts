import { useEffect, useState } from "react";
import { fetchSteamWishlist } from "../services/SteamService";
import type { SteamWishlistResponse } from "../types/types";
import { getCreds } from "../services/AccountService";

type UseParams = {
    pollMs: number;
};

type UseReturn = SteamWishlistResponse | null;

// Hook to manage fetching and updating the Steam wishlist periodically
export function useSteamWishlist({ pollMs }: UseParams): UseReturn {
    const [state, setState] = useState<UseReturn>(null);

    useEffect(() => {
        let stop = false;

        async function tick() {
            try {
                const creds = getCreds();
                if (!creds) {
                    // No session -> clear state and stop polling until auth changes
                    setState(null);
                    return;
                }

                const next = await fetchSteamWishlist();
                if (!next.ok) {
                    // Leave previous state, but don't blow up
                    return;
                }

                setState((prev) => {
                    if (!prev) return next;
                    // Avoid unnecessary re-renders if nothing has changed
                    const sameLastSynced = prev.lastSynced === next.lastSynced;
                    const sameLength = (prev.items?.length ?? 0) === (next.items?.length ?? 0);
                    return sameLastSynced && sameLength ? prev : next;
                });
            } catch {
                // ignore errors, we'll just try again next tick
            }

            if (!stop) {
                setTimeout(tick, pollMs);
            }
        }

        // initial tick
        void tick();

        const onAuth = () => {
            // restart immediately on auth change
            setState(null);
            if (!stop) {
                void tick();
            }
        };

        window.addEventListener("sb:auth-changed", onAuth);
        return () => {
            stop = true;
            window.removeEventListener("sb:auth-changed", onAuth);
        };
    }, [pollMs]);

    return state;
}
