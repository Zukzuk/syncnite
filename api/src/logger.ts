type Level = "error" | "warn" | "info" | "debug" | "trace";
const levelOrder: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const APP_VERSION = process.env.APP_VERSION ?? "dev";
const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
const threshold: number = levelOrder[env] ?? levelOrder.info;
export type Logger = {
    level: Level;

    // INTERNAL logging (adds [api] + scopes)
    error: (...a: any[]) => void;
    warn: (...a: any[]) => void;
    info: (...a: any[]) => void;
    debug: (...a: any[]) => void;
    trace: (...a: any[]) => void;

    // Create a scoped child for INTERNAL logs
    child: (scope: string) => Logger;

    /**
     * EXTERNAL ingestion: sanitize payload, KEEP sender's prefix/line if provided,
     * apply level threshold, then log via single console sink.
     *
     * Returns number of ingested events.
     */
    logExternal: (payload: unknown) => number;
};

const validLevels: readonly Level[] = ["error", "warn", "info", "debug", "trace"] as const;
function toLevel(raw: unknown): Level {
    const s = String(raw ?? "info").toLowerCase();
    return (validLevels as readonly string[]).includes(s as Level) ? (s as Level) : "info";
}

/**
 * Get the appropriate console method for the given log level.
 * @param level log level
 * @returns console method
 */
function consoleFor(level: Level) {
    return level === "error" ? console.error : level === "warn" ? console.warn : console.log;
}

/**
 * INTERNAL emit: adds [api][vX][LEVEL] and scopes. Enforces threshold and uses single console sink.
 * @param scopes 
 * @param level 
 * @param parts 
 * @returns 
 */
function emitInternal(scopes: string[], level: Level, parts: any[]) {
    if (levelOrder[level] > threshold) return;
    const prefix = `[api][v${APP_VERSION}][${level.toUpperCase()}]`;
    const scopeStr = scopes.map((s) => `[${s}]`);
    consoleFor(level)(prefix, ...scopeStr, ...parts);
}

/**
 * RAW emit for external lines: keeps the caller-provided line/prefix as-is.
 * Still enforces threshold and uses the same console sink. Adds meta if provided.
 * @param level 
 * @param line 
 * @param meta 
 * @returns 
 */
function emitRaw(level: Level, line: string, meta?: Record<string, unknown>) {
    if (levelOrder[level] > threshold) return;
    if (meta && Object.keys(meta).length > 0) {
        consoleFor(level)(line, meta);
    } else {
        consoleFor(level)(line);
    }
}

/**
 * The root logger instance. Create child loggers via `.child(scope)`.
 */
export const rootLog: Logger = (function create(scopes: string[] = []): Logger {
    return {
        level: env,

        // INTERNAL
        error: (...a: any[]) => emitInternal(scopes, "error", a),
        warn: (...a: any[]) => emitInternal(scopes, "warn", a),
        info: (...a: any[]) => emitInternal(scopes, "info", a),
        debug: (...a: any[]) => emitInternal(scopes, "debug", a),
        trace: (...a: any[]) => emitInternal(scopes, "trace", a),

        child(scope: string) {
            return create([...scopes, scope]);
        },

        // EXTERNAL
        logExternal(payload: unknown): number {
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
        },
    };
})();
