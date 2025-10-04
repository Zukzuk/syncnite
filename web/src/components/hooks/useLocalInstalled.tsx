import * as React from "react";
import { FILES } from "../../lib/constants";

export type LocalInstalledState = { set: Set<string> | null; updatedAt: string | null };

/**
 * Hook that polls localInstalled.json every `pollMs` ms.
 * - Returns { set, updatedAt } when used for reading
 * - Or may be called just for side-effects: useLocalInstalled(4000)
 */
export function useLocalInstalled(pollMs = 4000): LocalInstalledState {
    const [state, setState] = React.useState<LocalInstalledState>({ set: null, updatedAt: null });

    React.useEffect(() => {
        let stop = false;

        async function tick() {
            try {
                const url = `${FILES.localInstalled}?v=${Date.now()}`;
                const r = await fetch(url, { cache: "no-cache" });
                if (!r.ok) return;

                const txt = await r.text();
                // if nginx gives index.html by mistake
                if (txt.trim().startsWith("<")) return;

                const json = JSON.parse(txt);
                const ids: string[] | undefined = Array.isArray(json?.installed) ? json.installed : undefined;
                const updatedAt: string | undefined =
                    typeof json?.updatedAt === "string" ? json.updatedAt : undefined;

                if (ids && updatedAt) {
                    const next: LocalInstalledState = {
                        set: new Set(ids.map((s) => String(s).toLowerCase())),
                        updatedAt,
                    };
                    setState((prev) => (prev.updatedAt !== next.updatedAt ? next : prev));

                    // Fire an event for anyone who just wants side effects
                    window.dispatchEvent(new CustomEvent("pn:installed-updated", { detail: { updatedAt } }));
                }
            } catch {
                /* ignore network errors */
            }
            if (!stop) setTimeout(tick, pollMs);
        }

        tick();
        return () => {
            stop = true;
        };
    }, [pollMs]);

    return state;
}
