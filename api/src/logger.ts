// src/logger.ts
type Level = "error" | "warn" | "info" | "debug" | "trace";

const APP_VERSION = process.env.APP_VERSION ?? "dev";
const levelOrder: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
const threshold: number = levelOrder[env] ?? levelOrder.info;

function emit(level: Level, parts: any[]) {
    if (levelOrder[level] > threshold) return;
    const prefix = `[api][v${APP_VERSION}][${level.toUpperCase()}]`;
    // keep a single console sink to preserve timestamps from node
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
        prefix,
        ...parts
    );
}

export const log = {
    level: env,
    error: (...a: any[]) => emit("error", a),
    warn: (...a: any[]) => emit("warn", a),
    info: (...a: any[]) => emit("info", a),
    debug: (...a: any[]) => emit("debug", a),
    trace: (...a: any[]) => emit("trace", a),
    child: (scope: string) => ({
        error: (...a: any[]) => emit("error", [`[${scope}]`, ...a]),
        warn: (...a: any[]) => emit("warn", [`[${scope}]`, ...a]),
        info: (...a: any[]) => emit("info", [`[${scope}]`, ...a]),
        debug: (...a: any[]) => emit("debug", [`[${scope}]`, ...a]),
        trace: (...a: any[]) => emit("trace", [`[${scope}]`, ...a]),
    })
};
