import { LOG_LEVEL } from "./constants";
import { SyncBus } from "./services/EventBusService";

type Level = "error" | "warn" | "info" | "debug" | "trace";

const levelOrder: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const validLevels: readonly Level[] = ["error", "warn", "info", "debug", "trace"] as const;
const APP_VERSION = process.env.APP_VERSION ?? "dev";
const env = (process.env.LOG_LEVEL ?? LOG_LEVEL).toLowerCase() as Level;
const threshold: number = levelOrder[env] ?? levelOrder.info;

export type Logger = {
    level: Level;
    // INTERNAL logging (adds [api] + scopes)
    error: (...a: any[]) => void;
    warn: (...a: any[]) => void;
    info: (...a: any[]) => void;
    debug: (...a: any[]) => void;
    trace: (...a: any[]) => void;
    /**
     * Raw ingestion: sanitize payload, KEEP sender's prefix/line if provided,
     * apply level threshold, then log via single console sink.
     * Returns number of ingested events.
     */
    raw: (payload: unknown) => number;
    // Create a scoped child for INTERNAL logs
    child: (scope: string) => Logger;
};

function toLevel(raw: unknown): Level {
    const s = String(raw ?? "info").toLowerCase();
    return (validLevels as readonly string[]).includes(s as Level) ? (s as Level) : "info";
}

// helper to select console method based on level
function consoleFor(level: Level) {
    return level === "error" ? console.error : level === "warn" ? console.warn : console.log;
}

// raw emit method exposed on logger
function raw(payload: unknown): number {
    const events = Array.isArray(payload) ? payload : [payload];

    const sanitized = events
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => {
            const level = toLevel(e.level);
            const ts = (e.ts as string) || new Date().toISOString();
            const kind = String(e.kind ?? "event");
            const msg = e.msg != null ? String(e.msg) : "";
            const src = (e.src as string) || "external";

            // Prefer a fully formatted line the sender provided (KEEP AS-IS)
            const providedLine = typeof e.line === "string" ? e.line : undefined;

            // If no preformatted line, construct a minimal one without adding [api] or scopes
            // We keep it neutral (e.g., "[ext]" if src suggests extension), but do not force it.
            const inferredPrefix =
                src.toLowerCase().includes("ext") || src.toLowerCase().includes("playnite")
                    ? "[ext]"
                    : `[${src}]`;

            const line =
                providedLine ||
                (msg
                    ? `${inferredPrefix} ${msg}`
                    : `${inferredPrefix} ${kind}`);

            const meta: Record<string, unknown> = { ts, kind, src };
            if (e.ctx && typeof e.ctx === "object") meta.ctx = e.ctx;
            if (e.data && typeof e.data === "object") meta.data = e.data;
            if (e.err != null) meta.err = String(e.err);

            return { level, line, meta };
        });

    if (!sanitized.length) return 0;

    for (const ev of sanitized) {
        emitRaw(ev.level, ev.line, ev.meta);
    }
    return sanitized.length;
}

// internal emit: adds [api][version][level][scopes], enforce threshold, single console sink.
function emitInternal(scopes: string[], level: Level, parts?: any[]) {
    if (levelOrder[level] > threshold) return;

    const prefix = `[api][v${APP_VERSION}][${level.toUpperCase()}]`;
    const scopeStr = scopes.map((s) => `[${s}]`);
    if (threshold >= levelOrder.debug && parts && parts.length > 0) {
        consoleFor(level)(prefix, ...scopeStr, ...parts);
    } else if (parts && parts.length > 0) {
        consoleFor(level)(prefix, ...scopeStr, parts[0]);
    } else {
        consoleFor(level)(prefix, ...scopeStr);
    }

    // ---- Global broadcast ----
    try {
        const first = parts && parts.length > 0 ? parts[0] : "";
        const line = typeof first === "string" ? first : JSON.stringify(first ?? "");
        SyncBus.publish({ type: "log", data: line });
    } catch {
        /* ignore */
    }
}

// raw emit: sanitize payload, KEEP sender's prefix/line if provided, enforce threshold, single console sink.
function emitRaw(level: Level, line: string, meta?: Record<string, unknown>) {
    if (levelOrder[level] > threshold) return;

    if (threshold >= levelOrder.debug && meta && Object.keys(meta).length > 0) {
        consoleFor(level)(line, meta);
    } else {
        consoleFor(level)(line);
    }

    // ---- Global broadcast ----
    try {
        const kind = String(meta?.kind ?? "");
        const d = (meta?.data ?? {}) as any;
        const isProgress = kind === "progress" || (d && typeof d.percent === "number");

        if (isProgress) {
            const phase = (d?.phase ?? null) as any;
            const percent = Number(d?.percent) || 0;
            SyncBus.publish({ type: "progress", data: { phase, percent } });
            if (line) SyncBus.publish({ type: "log", data: line });
        } else {
            SyncBus.publish({ type: "log", data: line });
        }
    } catch {
        /* ignore */
    }
}

// Root logger instance
export const rootLog: Logger = (function create(scopes: string[] = []): Logger {
    return {
        level: env,

        // INTERNAL
        error: (...a: any[]) => emitInternal(scopes, "error", a),
        warn: (...a: any[]) => emitInternal(scopes, "warn", a),
        info: (...a: any[]) => emitInternal(scopes, "info", a),
        debug: (...a: any[]) => emitInternal(scopes, "debug", a),
        trace: (...a: any[]) => emitInternal(scopes, "trace", a),
        raw,
        child(scope: string) {
            return create([...scopes, scope]);
        },
    };
})();
