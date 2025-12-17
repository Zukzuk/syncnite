import * as React from "react";

export const INTRO_DONE_MS = 1400;
export const LOGO_EXIT_MS = 280;

type GateStyle = React.CSSProperties;

function buildGateStyle(enabled: boolean, done: boolean): GateStyle {
    if (!enabled) {
        return { opacity: 1, transform: "none", pointerEvents: "auto", visibility: "visible" };
    }

    // visibility prevents a flash on mount/navigation
    if (!done) {
        return {
            opacity: 0,
            transform: "translateY(6px)",
            transition: "opacity 220ms ease, transform 220ms ease",
            pointerEvents: "none",
            visibility: "hidden",
        };
    }

    return {
        opacity: 1,
        transform: "translateY(0)",
        transition: "opacity 220ms ease, transform 220ms ease",
        pointerEvents: "auto",
        visibility: "visible",
    };
}

type ExitResult<T> = {
    exiting: boolean;
    startExit: (payload: T, commit: (payload: T) => void) => void;
};

function useExit<T>(ms: number): ExitResult<T> {
    const [exiting, setExiting] = React.useState(false);
    const pendingRef = React.useRef<T | null>(null);

    const startExit = React.useCallback(
        (payload: T, commit: (payload: T) => void) => {
            pendingRef.current = payload;
            setExiting(true);

            window.setTimeout(() => {
                const p = pendingRef.current;
                if (p) commit(p);
            }, ms);
        },
        [ms]
    );

    return { exiting, startExit };
}

// A hook to manage an intro gate and exit animation flow.
export function useIntroFlow<TExitPayload = unknown>(opts: {
    gateEnabled: boolean;
    /** if true: start hidden and reveal only after onIntroDone() */
    gateStartsHidden?: boolean;
    exitMs?: number;
}) {
    const { gateEnabled, gateStartsHidden = true, exitMs = LOGO_EXIT_MS } = opts;

    // --- Gate ---
    const [introDone, setIntroDone] = React.useState<boolean>(() => {
        if (!gateEnabled) return true;
        return !gateStartsHidden;
    });

    const doneOnceRef = React.useRef(false);

    // apply “hidden” gating before paint (prevents content peek)
    React.useLayoutEffect(() => {
        if (!gateEnabled || !gateStartsHidden) {
            doneOnceRef.current = true;
            setIntroDone(true);
            return;
        }
        doneOnceRef.current = false;
        setIntroDone(false);
    }, [gateEnabled, gateStartsHidden]);

    const onIntroDone = React.useCallback(() => {
        if (!gateEnabled || !gateStartsHidden) return;
        if (doneOnceRef.current) return;
        doneOnceRef.current = true;
        setIntroDone(true);
    }, [gateEnabled, gateStartsHidden]);

    const gateStyle = React.useMemo(
        () => buildGateStyle(gateEnabled && gateStartsHidden, introDone),
        [gateEnabled, gateStartsHidden, introDone]
    );

    // --- Exit ---
    const exit = useExit<TExitPayload>(exitMs);

    return {
        gate: {
            introDone,
            onIntroDone,
            gateStyle,
            showBurger: gateEnabled && introDone,
        },
        exit, // { exiting, startExit }
    };
}
