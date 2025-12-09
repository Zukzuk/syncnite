import * as React from "react";
import { fetchUser } from "../lib/utils";

type UseParams = {
    pollMs: number;
};

type UseReturn = {
    set: Set<string> | null;
    updatedAt: string | null
};

// A hook to manage local installed games with periodic updates.
export function useLocalInstalled({ pollMs }: UseParams): UseReturn {
    const [state, setState] = React.useState<UseReturn>({ set: null, updatedAt: null });

    React.useEffect(() => {
        let stop = false;

        async function tick() {
            try {
                const email = fetchUser();
                if (!email) { setState({ set: null, updatedAt: null }); return; }

                const url = `/data/installed/${email.toLowerCase()}.installed.json?v=${Date.now()}`;
                const r = await fetch(url, { cache: "no-cache" });
                if (!r.ok) return;

                const txt = await r.text();
                if (txt.trim().startsWith("<")) return; // nginx index.html guard

                const json = JSON.parse(txt);
                const ids: string[] | undefined = Array.isArray(json?.installed) ? json.installed : undefined;
                const updatedAt: string | undefined = typeof json?.updatedAt === "string" ? json.updatedAt : undefined;

                if (ids && updatedAt) {
                    const next: UseReturn = {
                        set: new Set(ids.map((s) => String(s).toLowerCase())),
                        updatedAt,
                    };
                    setState(prev => (prev.updatedAt !== next.updatedAt ? next : prev));
                    window.dispatchEvent(new CustomEvent("pn:installed-updated", { detail: { updatedAt } }));
                }
            } catch { /* ignore */ }
            if (!stop) setTimeout(tick, pollMs);
        }

        tick();
        
        const onAuth = () => { /* restart immediately on auth change */
            setState({ set: null, updatedAt: null });
        };

        window.addEventListener("sb:auth-changed", onAuth);
        return () => { stop = true; window.removeEventListener("sb:auth-changed", onAuth); };
    }, [pollMs]);

    return state;
}
