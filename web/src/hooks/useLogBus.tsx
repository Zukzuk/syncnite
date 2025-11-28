import * as React from "react";
import { LogBus } from "../services/LogBus";

type UseReturn = {
    lines: string[];
    text: string;
    clear: () => void;
    append: (line: string) => void;
};

// A hook to manage and provide log bus information.
export function useLogBus(): UseReturn {
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
