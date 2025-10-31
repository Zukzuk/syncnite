import * as React from "react";
import { LogBus } from "../services/LogBus";

/**
 * React hook to consume the global LogBus as a single textarea-friendly string.
 * Keeps newest-first ordering and updates in real time.
 */
export function useLogBus() {
    const [lines, setLines] = React.useState<string[]>(() => LogBus.get());

    React.useEffect(() => {
        return LogBus.subscribe((l) => setLines(l));
    }, []);

    const text = React.useMemo(() => lines.join("\n"), [lines]);

    return {
        lines,
        text,
        clear: () => LogBus.clear(),
        append: (line: string) => LogBus.append(line),
    };
}
