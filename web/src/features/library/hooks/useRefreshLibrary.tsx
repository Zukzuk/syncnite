import * as React from "react";
import { FILES } from "../../../lib/constants";

type UseParams = {
    pollMs: number;
};

type UseReturn = {
    version: number;
    updatedAt: string | null
};

/** Hook to manage library refresh state */
export function useRefreshLibrary({ pollMs }: UseParams): UseReturn {
    const [version, setVersion] = React.useState(0);``
    const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
    const lastRef = React.useRef<string>("");

    React.useEffect(() => {
        let stop = false;
        async function tick() {
            try {
                const r = await fetch(`${FILES.manifest}?v=${Date.now()}`, { cache: "no-store" });
                if (r.ok) {
                    const txt = await r.text();
                    if (txt.trim().startsWith("{") && txt !== lastRef.current) {
                        lastRef.current = txt;
                        setVersion(v => v + 1);
                        try {
                            const parsed = JSON.parse(txt);
                            setUpdatedAt(typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString());
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
