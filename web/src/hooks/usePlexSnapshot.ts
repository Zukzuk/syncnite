import { useEffect, useRef, useState } from "react";
import { FILES } from "../constants";

export function usePlexSnapshot({ pollMs }: { pollMs: number }) {
    const [version, setVersion] = useState(0);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const lastRef = useRef<string>("");

    useEffect(() => {
        let stop = false;

        async function tick() {
            try {
                const r = await fetch(`${FILES.plex.snapshot.dir}/${FILES.plex.snapshot.file}?v=${Date.now()}`, { cache: "no-store" });
                if (r.ok) {
                    const txt = await r.text();
                    if (txt.trim().startsWith("{") && txt !== lastRef.current) {
                        lastRef.current = txt;
                        setVersion(v => v + 1);
                        try {
                            const parsed = JSON.parse(txt);
                            const ua = typeof parsed?.UpdatedAt === "string" ? parsed.UpdatedAt : new Date().toISOString();
                            setUpdatedAt(ua);
                        } catch {
                            setUpdatedAt(new Date().toISOString());
                        }
                    }
                }
            } catch { /* ignore */ }

            if (!stop) setTimeout(tick, pollMs);
        }

        tick();
        return () => { stop = true; };
    }, [pollMs]);

    return { version, updatedAt };
}
