import { RefObject, useLayoutEffect, useState } from "react";

function getVisualViewportHeight() {
    // Best available "what the user can actually see"
    return window.visualViewport?.height ?? window.innerHeight;
}

export function useStableViewportSize(ref: RefObject<HTMLElement>, minWidth = 0) {
    const [size, setSize] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        let raf = 0;

        const measure = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el2 = ref.current;
                if (!el2) return;

                // Element’s actual scroll viewport
                const w = Math.max(minWidth, el2.clientWidth);
                const h = Math.max(0, el2.clientHeight);

                // Visual viewport (iOS address bar / toolbar changes)
                const vvh = getVisualViewportHeight();

                // If iOS under-reports element height, clamp upward.
                // (This avoids “too low” heights breaking virtualization.)
                const safeH = Math.max(h, Math.floor(vvh));

                setSize({ w: Math.floor(w), h: safeH });
            });
        };

        const ro = new ResizeObserver(measure);
        ro.observe(el);

        window.addEventListener("resize", measure, { passive: true });
        window.addEventListener("orientationchange", measure, { passive: true });

        const vv = window.visualViewport;
        vv?.addEventListener("resize", measure, { passive: true });
        vv?.addEventListener("scroll", measure, { passive: true }); // toolbar show/hide

        measure();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("resize", measure);
            window.removeEventListener("orientationchange", measure);
            vv?.removeEventListener("resize", measure);
            vv?.removeEventListener("scroll", measure);
        };
    }, [ref, minWidth]);

    return size;
}
