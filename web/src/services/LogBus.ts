import { KEY, MAX_LINES } from "../lib/constants";

let lines: string[] = restore();
type LogListener = (lines: string[]) => void;
const listeners = new Set<LogListener>();

function store() {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(lines));
    } catch { }
}

function restore(): string[] {
    try {
        const raw = sessionStorage.getItem(KEY);
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

// Global log buffer that survives route changes AND page reloads (via sessionStorage).
// Newest-first order. Keeps up to MAX lines.
export const LogBus = {
    append(line: string) {
        if (!line) return;
        lines = [line, ...lines].slice(0, MAX_LINES);
        store();
        emit();
    },
    
    clear() {
        lines = [];
        store();
        emit();
    },

    get(): string[] {
        return [...lines];
    },

    subscribe(fn: LogListener) {
        listeners.add(fn);
        fn([...lines]); // immediate hydration
        return () => { listeners.delete(fn); };
    },
};
