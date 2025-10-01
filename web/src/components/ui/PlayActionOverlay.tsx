import React from "react";
import { IconPlayerPlayFilled, IconDownload } from "../../lib/icons";
import { GRID, Z_INDEX } from "../../lib/constants";

export function PlayActionOverlay({
    installed,
    href,
    title,
    children,
}: {
    installed: boolean;
    href: string;
    title: string;
    children: React.ReactNode;
}) {
    const label = installed ? `Play ${title}` : `Install ${title}`;

    return (
        <div style={{ position: "relative", width: GRID.smallBox, height: GRID.smallBox }}>
            {children}
            <a
                href={href}
                title={label}
                aria-label={label}
                className="play-overlay"
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    zIndex: Z_INDEX.iconOverlay,
                    borderRadius: 6,
                    background: "transparent",
                }}
            >
                <span className="play-overlay__icon" aria-hidden>
                    {installed ? <IconPlayerPlayFilled size={22} stroke={1} /> : <IconDownload size={22} stroke={2.2} />}
                </span>
            </a>
        </div>
    );
}
