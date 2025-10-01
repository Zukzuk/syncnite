import React from "react";
import { isIcoPath, icoToPngDataUrl } from "../../lib/utils";
import { GRID } from "../../lib/constants";

export function IconImage({ src, alt }: { src: string; alt?: string }) {
  const [url, setUrl] = React.useState(src);

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
        // fallback if the src fails to load
        if (isIcoPath(src)) {
          const data = await icoToPngDataUrl(src);
          if (data) (e.target as HTMLImageElement).src = data;
        }
      }}
    />
  );
}
