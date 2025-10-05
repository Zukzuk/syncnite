import React from "react";
import { isIcoPath, icoToPngDataUrl } from "../../lib/utils";
import { GRID } from "../../lib/constants";

type Props = { src: string; alt?: string };

export function IconImage({ src, alt }: Props) {
  const [url, setUrl] = React.useState(src);
  const retriedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    async function maybeConvert() {
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
      width={GRID.smallBox}
      height={GRID.smallBox}
      style={{ width: GRID.smallBox, height: GRID.smallBox, objectFit: "contain", borderRadius: 6, background: "var(--mantine-color-default)" }}
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
