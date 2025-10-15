// src/utils/sse.ts
import type { Response } from "express";

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
    heartbeat: () => void;
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

    const sink: SseSink = {
        send: (type, data) => write(type, data),
        log: (line) => write("log", String(line ?? "")),
        progress: (p) => write("progress", { phase: p?.phase ?? null, percent: p?.percent ?? null, ...p }),
        done: () => write("done", "ok"),
        error: (msg) => write("error", String(msg || "error")),
        heartbeat: () => write("log", "[♥]"),
        close: () => { try { res.end(); } catch { } },
    };

    // close on client disconnect
    const clean = () => { /* nothing else for now */ };
    res.on("close", clean);
    res.on("finish", clean);

    return sink;
}
