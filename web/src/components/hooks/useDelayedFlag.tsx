import * as React from "react";

export function useDelayedFlag(active: boolean, delayMs: number) {
    const [flag, setFlag] = React.useState(false);

    React.useEffect(() => {
        if (active) {
            const t = window.setTimeout(() => setFlag(true), delayMs);
            return () => window.clearTimeout(t);
        }
        setFlag(false);
    }, [active, delayMs]);

    return flag;
}
