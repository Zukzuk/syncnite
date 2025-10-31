import { LogBus } from "./LogBus";
import { API_ENDPOINTS } from "../lib/constants";

/**
 * Starts a single global EventSource connection.
 * - Pipes `log` events into LogBus.
 * - Forwards `progress` as CustomEvent("pn:import-progress") to integrate with existing UI.
 * - Emits basic lifecycle messages to LogBus for visibility.
 */
export function startGlobalSse() {
    const es = new EventSource(API_ENDPOINTS.SSE);
    // If you need credentials/cookies later: 
    // const es = new EventSource(API_ENDPOINTS.SSE, { withCredentials: true } as any);

    es.onopen = () => {
        LogBus.append("[sse] connected");
    };

    es.addEventListener("log", (e: MessageEvent) => {
        // Server sends either plain text or JSON-escaped strings; treat as text
        const line = String(e.data ?? "");
        if (line) LogBus.append(line);
    });

    es.addEventListener("progress", (e: MessageEvent) => {
        // Progress payloads are JSON from the API's SSE sink
        // Forward to the app's existing bus so importer UI updates keep working.
        // Your useImporter/BackupImporter already listen for "pn:import-progress". :contentReference[oaicite:4]{index=4}turn14file17
        try {
            const data = JSON.parse(String(e.data ?? "{}"));
            const detail = {
                phase: data?.phase ?? null,
                percent: typeof data?.percent === "number" ? Math.round(data.percent) : null,
                extras: data,
            };
            window.dispatchEvent(new CustomEvent("pn:import-progress", { detail }));
            if (data?.log) {
                LogBus.append(String(data.log));
            }
        } catch {
            // If it's not JSON, still show it to the user
            LogBus.append(String(e.data ?? ""));
        }
    });

    es.addEventListener("done", () => {
        LogBus.append("[sse] done");
        // Let the importer state machine settle via its own code paths.
    });

    es.addEventListener("error", (e: any) => {
        const msg = (e?.message ? `: ${e.message}` : "");
        LogBus.append(`[sse] error${msg}`);
    });

    es.onerror = () => {
        // Browser auto-reconnects; give the user a hint.
        LogBus.append("[sse] disconnected (browser will retry)...");
    };

    return () => {
        try { es.close(); } catch { }
        LogBus.append("[sse] closed");
    };
}
