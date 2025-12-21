import { useEffect, useRef, useState } from "react";
import ICO from "icojs";
import { useInterLinkedTheme } from "../hooks/useInterLinkedTheme";
import { CustomIconSVG } from "./CustomIcon";

function isIcoPath(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return /\.ico(\?|#|$)/i.test(u.pathname);
  } catch {
    return /\.ico(\?|#|$)/i.test(url);
  }
}

async function icoToPngDataUrl(icoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(icoUrl, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const images = await ICO.parse(buf, "image/png"); // returns PNG blobs
    if (!images?.length) return null;
    // choose largest by width
    const best = images.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    const blob = new Blob([best.buffer], { type: "image/png" });
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type Props = {
  src: string | null | undefined;
  alt?: string
};

export function IconGame({ src, alt }: Props) {

  if (!src) {
    return <CustomIconSVG type="fallback" />;
  }

  const { grid } = useInterLinkedTheme();
  const [url, setUrl] = useState(src);
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function maybeConvert() {
      if (!src) return;
      if (isIcoPath(src)) {
        const data = await icoToPngDataUrl(src);
        if (!cancelled && data) setUrl(data);
      } else {
        setUrl(src);
      }
    }
    maybeConvert();
    return () => { cancelled = true; };
  }, [src]);

  return (
    <img
      className="icon"
      src={url}
      alt={alt ?? ""}
      width={grid.iconSize}
      height={grid.iconSize}
      style={{
        width: grid.iconSize,
        height: grid.iconSize,
        objectFit: "contain",
        borderRadius: 6,
        background: "var(--interlinked-color-body)"
      }}
      onError={async (e) => {
        const img = e.target as HTMLImageElement;
        // ICO: try converting to PNG as before
        if (isIcoPath(src)) {
          const data = await icoToPngDataUrl(src);
          if (data) { img.src = data; return; }
        }
        // Non-ICO: retry once with a cache-busting query param
        if (!retriedRef.current && typeof url === "string") {
          retriedRef.current = true;
          const sep = url.includes("?") ? "&" : "?";
          img.src = `${url}${sep}v=${Date.now()}`;
        }
      }}
    />
  );
}
