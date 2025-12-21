import { useEffect, useMemo, useState } from "react";
import { LogBus } from "../services/LogBus";

type UseReturn = {
    lines: string[];
    text: string;
    clear: () => void;
    append: (line: string) => void;
};

// A hook to manage and provide log bus information.
export function useLogBus(): UseReturn {
    const [lines, setLines] = useState<string[]>(() => LogBus.get());

    useEffect(() => {
        return LogBus.subscribe((l) => setLines(l));
    }, []);

    const text = useMemo(() => lines.join("\n"), [lines]);

    return {
        lines,
        text,
        clear: () => LogBus.clear(),
        append: (line: string) => LogBus.append(line),
    };
}
