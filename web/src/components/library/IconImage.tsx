import React from "react";
import { FALLBACK_ICON, isIcoPath, icoToPngDataUrl } from "../../lib/utils";

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
      width={40}
      height={40}
      style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, background: "var(--mantine-color-default)" }}
      onError={async (e) => {
        // (existing onError code)
      }}
    />
  );
}
