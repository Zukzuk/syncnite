import * as React from "react";

type UseParams = {
    active: boolean;
    delayMs: number;
};

type UseReturn = boolean;

// A hook to manage a delayed boolean flag based on an active state.
export function useDelayedFlag({ active, delayMs }: UseParams): UseReturn {
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
