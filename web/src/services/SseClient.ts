import { LogBus } from "./LogBus";
import { API_ENDPOINTS } from "../lib/constants";

/**
 * Starts a global SSE connection to receive log and progress events from the server.
 * Intended for use in long-running operations like imports and backups.
 * Returns a function to close the connection when no longer needed.
 */
export function startGlobalSse() {
    const es = new EventSource(API_ENDPOINTS.SSE);
    // credentials/cookies are handled by the browser automatically 
    // const es = new EventSource(API_ENDPOINTS.SSE, { withCredentials: true } as any);

    // Lifecycle events
    es.onopen = () => {
        LogBus.append("[sse] connected");
    };

    // Custom events
    es.addEventListener("log", (e: MessageEvent) => {
        const line = String(e.data ?? "");
        if (line) LogBus.append(line);
    });

    // Progress events
    es.addEventListener("progress", (e: MessageEvent) => {
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

    // Done event
    es.addEventListener("done", () => {
        LogBus.append("[sse] done");
        // Let the importer state machine settle via its own code paths.
    });

    // Error events
    es.addEventListener("error", (e: any) => {
        const msg = (e?.message ? `: ${e.message}` : "");
        LogBus.append(`[sse] error${msg}`);
    });

    // Connection closed by server
    es.onerror = () => {
        LogBus.append("[sse] disconnected (browser will retry)...");
    };

    // Return a function to close the connection
    return () => {
        try { es.close(); } catch { }
        LogBus.append("[sse] closed");
    };
}
