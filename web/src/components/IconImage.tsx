import React from "react";
import { FALLBACK_ICON, isIcoPath, icoToPngDataUrl } from "../lib/utils";

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
      onError={async (e) => {
        // If non-ICO failed, just fallback.
        if (!isIcoPath(src)) {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_ICON;
          return;
        }
        // If ICO failed, try decode once; otherwise fallback.
        const data = await icoToPngDataUrl(src);
        (e.currentTarget as HTMLImageElement).src = data ?? FALLBACK_ICON;
      }}
    />
  );
}
