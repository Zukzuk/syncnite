import React from "react";
import { IconPlayerPlayFilled, IconDownload } from "../../lib/icons";
import { Z_INDEX } from "../../lib/constants";

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
        <div style={{ position: "relative", width: 40, height: 40 }}>
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
                    zIndex: Z_INDEX.overlay,
                    borderRadius: 6,
                    // transparent by default; hover styles are in CSS below
                    background: "transparent",
                }}
            >
                <span className="play-overlay__icon" aria-hidden>
                    {installed ? <IconPlayerPlayFilled size={22} stroke={2.2} /> : <IconDownload size={22} stroke={2.2} />}
                </span>
            </a>
        </div>
    );
}
