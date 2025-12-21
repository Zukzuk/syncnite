import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { AssociatedItems } from "../../../types/types";
import { useDelayedFlag } from "../../../hooks/useDelayedFlag";
import { AssociatedStackCard } from "./AssociatedStackCard";
import { useInterLinkedTheme } from "../../../hooks/useInterLinkedTheme";
import { useLibraryContext } from "../../../layout/LibraryContext";

type Props = {
    currentItemId: string;
    associatedDecks: AssociatedItems[];
    openDeckKey: string | null;
    stackColumns: number;
    onStackClick: (key: string) => void;
};

// Component to display associated stacks of decks in the library view.
export function AssociatedStacks({
    currentItemId,
    associatedDecks,
    openDeckKey,
    stackColumns,
    onStackClick,
}: Props): JSX.Element | null {
    if (!associatedDecks.length || stackColumns <= 0) return null;

    const lib = useLibraryContext();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);

    // Restore stacks scroll position per item
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const saved = lib.getStacksScrollTop(currentItemId);
        el.scrollTop = typeof saved === "number" ? saved : 0;
    }, [currentItemId]);

    // Persist stacks scroll position (rAF throttled)
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            lib.setStacksScrollTop(currentItemId, el.scrollTop);
        });
    }, [lib, currentItemId]);

    // Cleanup rAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const isOpenDelayed = useDelayedFlag({ active: true, delayMs: 210 });
    const { grid } = useInterLinkedTheme();

    return (
        <Box
            ref={scrollRef}
            onScroll={onScroll}
            className="subtle-scrollbar"
            pl={4}
            style={{
                flex: 1,
                minWidth: 0,
                marginTop: 22,
                height: "calc(100% - 22px)",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehaviorY: "contain",
                opacity: isOpenDelayed ? 1 : 0,
                transform: isOpenDelayed ? "translateY(0)" : "translateY(12px)",
                willChange: "opacity, transform",
                transitionProperty: "opacity, transform",
                transitionDuration: "220ms, 260ms",
                transitionTimingFunction: "ease, ease",
            }}
        >
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${stackColumns}, ${grid.cardWidth * 0.7}px)`,
                    gap: grid.gap,
                    justifyContent: "flex-start",
                    alignContent: "flex-start",
                }}
            >
                {associatedDecks.map((stack) => (
                    <AssociatedStackCard
                        key={stack.key}
                        stack={stack}
                        isOpen={openDeckKey === stack.key}
                        onStackClick={onStackClick}
                    />
                ))}
            </Box>
        </Box>
    );
}
