let lines: string[] = restore();
type LogListener = (lines: string[]) => void;
const listeners = new Set<LogListener>();

interface LogBus {
    append(line: string): void;
    clear(): void;
    get(): string[];
    subscribe(fn: LogListener): () => void;
}

function store() {
    try {
        sessionStorage.setItem("pn_logs", JSON.stringify(lines));
    } catch { }
}

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
} as LogBus;
