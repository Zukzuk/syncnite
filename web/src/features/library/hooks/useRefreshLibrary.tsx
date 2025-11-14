import * as React from "react";
import { FILES } from "../../../lib/constants";

type UseParams = {
    pollMs: number;
};

type UseReturn = {
    version: number;
    updatedAt: string | null
};

/**
 * Unified source of truth for the library data.
 * - Loads games/tags/sources 1:1 (no shape coercions)
 * - Updates when /data/snapshot/snapshot.json changes
 * - Patches "installed" quickly when local Installed.json changes
 */
export function useRefreshLibrary({ pollMs }: UseParams): UseReturn {
    const [version, setVersion] = React.useState(0);
    const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
    const lastRef = React.useRef<string>("");

    React.useEffect(() => {
        let stop = false;
        async function tick() {
            try {
                const r = await fetch(`${FILES.snapshot}?v=${Date.now()}`, { cache: "no-store" });
                if (r.ok) {
                    const txt = await r.text();
                    if (txt.trim().startsWith("{") && txt !== lastRef.current) {
                        lastRef.current = txt;
                        setVersion(v => v + 1);
                        try {
                            const parsed = JSON.parse(txt);
                            const ua =
                                typeof parsed?.updatedAt === "string"
                                    ? parsed.updatedAt
                                    : new Date().toISOString();
                            setUpdatedAt(ua);
                        } catch {
                            setUpdatedAt(new Date().toISOString());
                        }
                    }
                }
            } catch { /* strict: ignore */ }
            if (!stop) setTimeout(tick, pollMs);
        }
        tick();
        return () => { stop = true; };
    }, [pollMs]);

    return { version, updatedAt };
}
