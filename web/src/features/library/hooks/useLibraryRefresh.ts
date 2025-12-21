import { useEffect, useRef, useState } from "react";
import { FILES } from "../../../constants";

type UseParams = {
    pollMs: number;
};

type UseReturn = {
    version: number;
    updatedAt: string | null
};

// A hook to manage refreshing the library data with periodic checks.
export function useLibraryRefresh({ pollMs }: UseParams): UseReturn {
    const [version, setVersion] = useState(0);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const lastRef = useRef<string>("");

    useEffect(() => {
        let stop = false;
        async function tick() {
            try {
                const r = await fetch(`${FILES.snapshot.dir}/${FILES.snapshot.file}?v=${Date.now()}`, { cache: "no-store" });
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
