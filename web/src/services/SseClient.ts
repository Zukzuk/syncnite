import { LogBus } from "./LogBus";
import { API_ENDPOINTS } from "../lib/constants";

export function startGlobalSse() {
    const es = new EventSource(API_ENDPOINTS.SSE);
    //const es = new EventSource(API_ENDPOINTS.SSE, { withCredentials: true } as any);

    es.addEventListener("log", (e: MessageEvent) => LogBus.append(String(e.data || "")));
    es.addEventListener("progress", (e: MessageEvent) => {});
    es.addEventListener("done", () => {});
    es.onerror = () => LogBus.append("[sse] disconnected (will retry)...");
    return () => { try { es.close(); } catch { } };
}
