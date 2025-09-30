import * as React from "react";
import { FILES } from "../../../lib/constants";

type LocalInstalled = { set: Set<string> | null; updatedAt: string | null };

export function useLocalInstalled(pollMs = 4000): LocalInstalled {
    const [state, setState] = React.useState<LocalInstalled>({ set: null, updatedAt: null });

    React.useEffect(() => {
        let stop = false;

        async function tick() {
            try {
                // cache-bust
                const url = `${FILES.localInstalled}?v=${Date.now()}`;
                const r = await fetch(url, { cache: "no-cache" });
                if (!r.ok) return;

                const txt = await r.text();
                // if nginx gives us index.html by mistake, ignore
                if (txt.trim().startsWith("<")) return;

                const json = JSON.parse(txt);
                const ids: string[] | undefined = Array.isArray(json?.installed) ? json.installed : undefined;
                const updatedAt: string | undefined = typeof json?.updatedAt === "string" ? json.updatedAt : undefined;

                if (ids && updatedAt) {
                    const next = { set: new Set(ids.map(s => String(s).toLowerCase())), updatedAt };
                    setState(prev => (prev.updatedAt !== next.updatedAt ? next : prev));
                }
            } catch {
                /* ignore */
            }
            if (!stop) setTimeout(tick, pollMs);
        }

        tick();
        return () => { stop = true; };
    }, [pollMs]);

    return state;
}
