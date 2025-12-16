import React from "react";
import { Stack, Text } from "@mantine/core";
import { getTheme } from "../theme";

export const LogoIntro = React.memo(function LogoIntro() {
    const { isDesktop, isDark } = getTheme();
    const primary = isDark
        ? "var(--interlinked-color-primary-soft)"
        : "var(--interlinked-color-primary)";

    const [animated, setAnimated] = React.useState(true);

    React.useEffect(() => {
        const t = window.setTimeout(() => setAnimated(false), 1400);
        return () => window.clearTimeout(t);
    }, []);

    return (
        <>
            <style>{`
        @media (prefers-reduced-motion: reduce) {
          .logoWrap[data-animated="true"],
          .logoWrap[data-animated="true"] * {
            animation: none !important;
            transition: none !important;
          }
        }

        .logoWrap {
          position: absolute;
          display: block;
          top: 20px;
          height: 36px;
          width: 120px;
          overflow: hidden;
          transform: skewY(-6deg);
          transform-origin: middle middle;
          -webkit-font-smoothing: antialiased;
          left: var(--logo-left);
        }

        /* End-state defaults (static) */
        .logoWrap .logoLinked { opacity: 1; transform: translateY(0); filter: blur(0); }

        /* Intro only */
        .logoWrap[data-animated="true"] {
          opacity: 0;
          filter: blur(10px);
          transform: skewY(-6deg) translateX(-22px) scale(0.98);
          animation: logoIn 520ms cubic-bezier(.2,.9,.2,1) 40ms forwards,
                     logoSettle 500ms ease-out 680ms forwards;
        }

        .logoInter, .logoLinked {
          position: relative;
          width: fit-content;
          will-change: transform, opacity, filter, clip-path;
        }

        .logoWrap[data-animated="true"] .logoInter {
          animation: flicker 780ms steps(2, end) 120ms 1,
                     microJitter 240ms steps(2, end) 920ms 1,
                     tearY 520ms steps(1, end) 360ms 1;
        }

        .logoLinked {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }

        .logoWrap[data-animated="true"] .logoLinked {
          opacity: 0;
          transform: translateY(6px);
          filter: blur(2px);
          animation: linkedPop 420ms cubic-bezier(.2,.9,.2,1) 280ms forwards,
                     microJitter 240ms steps(2, end) 920ms 1,
                     tearY 520ms steps(1, end) 420ms 1;
        }

        /* Glitch slices */
        .logoGlitch {
          position: relative;
          display: inline-block;
        }
        .logoGlitch::before,
        .logoGlitch::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }

        .logoWrap[data-animated="true"] .logoGlitch::before {
          text-shadow: 2px 0 rgba(0, 255, 255, 0.75);
          clip-path: inset(0 0 58% 0);
          animation: glitchSlice 520ms steps(2,end) 500ms 1;
        }
        .logoWrap[data-animated="true"] .logoGlitch::after {
          text-shadow: -2px 0 rgba(255, 0, 128, 0.75);
          clip-path: inset(54% 0 0 0);
          animation: glitchSlice 520ms steps(2,end) 500ms 1;
        }

        @keyframes logoIn {
          to { opacity: 1; filter: blur(0); transform: skewY(-6deg) translateX(0) scale(1); }
        }
        @keyframes logoSettle {
          0% { transform: skewY(-6deg) translateX(0) scale(1); }
          60% { transform: skewY(-6deg) translateX(0) scale(1.01); }
          100% { transform: skewY(-6deg) translateX(0) scale(1); }
        }

        @keyframes flicker {
          0% { opacity: 0; filter: blur(3px); }
          10% { opacity: 1; filter: blur(0); }
          20% { opacity: .2; }
          30% { opacity: 1; }
          40% { opacity: .5; }
          55% { opacity: 1; }
          70% { opacity: .7; }
          100% { opacity: 1; }
        }

        @keyframes linkedPop { to { opacity: 1; transform: translateY(0); filter: blur(0); } }

        @keyframes glitchSlice {
          0%   { opacity: 0; transform: translateX(0); }
          12%  { opacity: 1; transform: translateX(-3px); }
          24%  { opacity: 1; transform: translateX(4px); }
          36%  { opacity: 1; transform: translateX(-5px); }
          48%  { opacity: 1; transform: translateX(2px); }
          60%  { opacity: 1; transform: translateX(-2px); }
          100% { opacity: 0; transform: translateX(0); }
        }

        @keyframes microJitter {
          0% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          50% { transform: translateX(1px); }
          75% { transform: translateX(-1px); }
          100% { transform: translateX(0); }
        }

        /* Tearing: vertical band clip + horizontal jumps */
        @keyframes tearY {
          0%   { clip-path: inset(0 0 0 0); }
          12%  { clip-path: inset(0 0 72% 0); }
          18%  { clip-path: inset(22% 0 38% 0); }
          26%  { clip-path: inset(58% 0 10% 0); }
          34%  { clip-path: inset(8% 0 68% 0); }
          46%  { clip-path: inset(36% 0 28% 0); }
          58%  { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
      `}</style>

            <Stack
                className="logoWrap"
                data-animated={animated ? "true" : "false"}
                gap={0}
                style={
                    {
                        ["--logo-left" as any]: `${isDesktop ? 14 : 40}px`,
                    } as React.CSSProperties
                }
            >

                <Text
                    truncate
                    ff="Cyber City"
                    className="logoInter"
                    style={{
                        fontSize: 22,
                        width: "fit-content",
                        color: primary,
                        textShadow: isDark ? "0 0 10px rgba(255,255,255,0.12)" : undefined,
                    }}
                >
                    <span className="logoGlitch" data-text="Inter">Inter</span>
                </Text>

                <Text
                    truncate
                    ff="Cyber City"
                    className="logoLinked"
                    style={{
                        fontSize: 13,
                        left: 34,
                        top: -12,
                        width: "fit-content",
                        color: "var(--interlinked-color-secondary)",
                    }}
                >
                    <span className="logoGlitch" data-text="LINKED">LINKED</span>
                </Text>
            </Stack>
        </>
    );
});
