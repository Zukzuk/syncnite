import type { Response } from "express";
import { AsyncLocalStorage } from "node:async_hooks";

export type SseEvent =
    | { type: "log"; data: string }
    | { type: "progress"; data: { phase?: string | null; percent?: number | null;[k: string]: any } }
    | { type: "done"; data: "ok" }
    | { type: "error"; data: string };

export type SseSink = {
    send: (type: SseEvent["type"], data: SseEvent["data"]) => void;
    log: (line: string) => void;
    progress: (p: { phase?: string | null; percent?: number | null;[k: string]: any }) => void;
    done: () => void;
    error: (msg: string) => void;
    close: () => void;
};

export function createSSE(res: Response): SseSink {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const write = (type: string, data: any) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        res.write(`event: ${type}\n`);
        res.write(`data: ${String(payload).replace(/\n/g, "\\n")}\n\n`);
    };

    return {
        send: (type, data) => write(type, data),
        log: (line) => write("log", String(line ?? "")),
        progress: (p) => write("progress", { phase: p?.phase ?? null, percent: p?.percent ?? null, ...p }),
        done: () => write("done", "ok"),
        error: (msg) => write("error", String(msg || "error")),
        close: () => { try { res.end(); } catch { } },
    };
}

/** Per-request SSE context so any logger output auto-forwards. */
const sseALS = new AsyncLocalStorage<SseSink>();
export function withSSE<T>(sse: SseSink, fn: () => Promise<T> | T) {
    return sseALS.run(sse, fn);
}
export function currentSSE(): SseSink | null {
    return sseALS.getStore() ?? null;
}
