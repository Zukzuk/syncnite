import { ILogBus, LogListener } from "../types/app";

let lines: string[] = restore();
const listeners = new Set<LogListener>();

// Persist logs to sessionStorage.
function store() {
    try {
        sessionStorage.setItem("pn_logs", JSON.stringify(lines));
    } catch { }
}

// Restore logs from sessionStorage.
function restore(): string[] {
    try {
        const raw = sessionStorage.getItem("pn_logs");
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

// Notify all listeners of log updates.
function emit() {
    const snapshot = [...lines];
    listeners.forEach((fn) => fn(snapshot));
}

/**
 * A simple in-memory log bus with sessionStorage persistence.
 */
export const LogBus = {
    // Prepend new lines, capping at 1000 entries.
    append(line: string) {
        if (!line) return;
        lines = [line, ...lines].slice(0, 1000);
        store();
        emit();
    },
    
    // Clear all logs.
    clear() {
        lines = [];
        store();
        emit();
    },

    // Get current log lines.
    get(): string[] {
        return [...lines];
    },

    // Subscribe to log updates.
    subscribe(fn: LogListener) {
        listeners.add(fn);
        fn([...lines]); // immediate hydration
        return () => { listeners.delete(fn); };
    },
} as ILogBus;
