import type { Guidish, Link, GameDoc } from "./types";
import ICO from "icojs";

export function isIcoPath(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return /\.ico(\?|#|$)/i.test(u.pathname);
  } catch {
    return /\.ico(\?|#|$)/i.test(url);
  }
}

export function bucketLetter(title: string, sortingName: string) {
  const s = (sortingName || title || "").trim();
  const ch = s.charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "@";
}

export async function icoToPngDataUrl(icoUrl: string): Promise<string | null> {
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

export const asGuid = (v: Guidish): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const obj = v as Record<string, unknown>;
  for (const key of ["$guid", "$oid", "Guid", "Value"]) {
    const val = obj[key];
    if (typeof val === "string" && val.length) return val;
  }
  return null;
};

export const asGuidArray = (arr: Guidish[] | undefined): string[] =>
  Array.isArray(arr) ? (arr.map(asGuid).filter(Boolean) as string[]) : [];

export function normalizePath(p?: string): string | null {
  if (!p) return null;
  return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export const FALLBACK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
      <rect width='100%' height='100%' fill='#ddd'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='sans-serif' font-size='10' fill='#777'>no icon</text>
    </svg>`
  );

export function buildIconUrl(iconRel: string | null, iconId: string | null): string {
  if (iconRel && /^https?:\/\//i.test(iconRel)) return iconRel;
  if (iconRel) {
    const rel = iconRel.replace(/\\/g, "/").replace(/^\.?\//, "");
    const path = rel.startsWith("libraryfiles/") ? rel : `libraryfiles/${rel}`;
    return `/data/${path}`;
  }
  if (iconId) return `/data/libraryfiles/${iconId}.png`;
  return FALLBACK_ICON;
}

export const sourceUrlTemplates: Record<string, (g: GameDoc) => string | null> = {
  steam: (g) => {
    const id = String((g as any).GameId ?? "").trim();
    return /^\d+$/.test(id) ? `https://store.steampowered.com/app/${id}` : null;
  },
  epic: (g) => {
    const id = String((g as any).GameId ?? "").trim();
    return id ? `https://store.epicgames.com/p/${encodeURIComponent(id)}` : null;
  },
  gog: (g) => {
    const id = String((g as any).GameId ?? "").trim();
    return id ? `https://www.gog.com/game/${encodeURIComponent(id)}` : null;
  },
  "ubisoft connect": () => null,
  "ea app": () => null,
  "battle.net": () => null,
  xbox: () => null,
  humble: () => null,
  nintendo: () => null,
  "microsoft store": () => null
};

export function firstStoreishLink(links: Link[] | undefined, sourceName: string): string | null {
  if (!links?.length) return null;
  const lowerSrc = sourceName.toLowerCase();
  const prefer = links.find(l => {
    const n = (l.Name ?? "").toLowerCase();
    return n === "store" || n === lowerSrc || n.includes("store");
  });
  if (prefer?.Url) return prefer.Url;

  const byDomain = links.find(l => {
    const u = (l.Url ?? "").toLowerCase();
    return (
      (lowerSrc.includes("steam") && u.includes("steampowered.com")) ||
      (lowerSrc.includes("epic") && u.includes("epicgames.com")) ||
      (lowerSrc.includes("gog") && u.includes("gog.com")) ||
      (lowerSrc.includes("ubisoft") && (u.includes("ubisoft.com") || u.includes("uplay"))) ||
      (lowerSrc.includes("ea") && (u.includes("ea.com") || u.includes("origin.com"))) ||
      (lowerSrc.includes("battle.net") && (u.includes("battle.net") || u.includes("blizzard.com"))) ||
      (lowerSrc.includes("xbox") && (u.includes("xbox.com") || u.includes("microsoft.com"))) ||
      (lowerSrc.includes("humble") && u.includes("humblebundle.com")) ||
      (lowerSrc.includes("nintendo") && u.includes("nintendo.com"))
    );
  });
  return byDomain?.Url ?? null;
}

export function hasEmulatorTag(tags: string[]): boolean {
  return tags.some(t => /\bemulator(s)?\b/i.test(t));
}

export function myAbandonwareLink(title: string): string {
  return `https://www.myabandonware.com/search/q/${encodeURIComponent(title)}`;
}

export function effectiveLink(
  r: { url: string | null; source: string; title: string; tags: string[] }
): string | null {
  if (r.url) return r.url;
  if (!r.source && !hasEmulatorTag(r.tags)) {
    return myAbandonwareLink(r.title);
  }
  return null;
}

function parseYearFromString(s: string): number | null {
  // Accept "2021", "2021-05-03", "2021/05/03", "2021-05", "May 5, 2021", etc.
  const m = s.match(/(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  if (y >= 1970 && y <= 2100) return y;
  return null;
}

function parseYearFromNumber(n: number): number | null {
  // Heuristic: treat 10 or 13 digits as epoch seconds/millis
  if (n > 10_000_000_000) {
    const y = new Date(n).getUTCFullYear();
    return y >= 1970 && y <= 2100 ? y : null;
  }
  if (n > 1_000_000_000) {
    const y = new Date(n * 1000).getUTCFullYear();
    return y >= 1970 && y <= 2100 ? y : null;
  }
  // maybe already a year
  if (n >= 1970 && n <= 2100) return n;
  return null;
}

export function extractYear(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return parseYearFromNumber(val);
  if (typeof val === "string") return parseYearFromString(val);
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    // LiteDB / BSON-style
    if (typeof o["$date"] === "string") return parseYearFromString(o["$date"]);
    if (typeof o["Date"] === "string") return parseYearFromString(o["Date"]);
    if (typeof o["Ticks"] === "number") {
      // Ticks since 0001; convert to ms
      const ticks = o["Ticks"];
      const ms = (ticks - 621355968000000000) / 10000;
      return parseYearFromNumber(ms);
    }
    // Generic Year or Value fields:
    if (typeof o["Year"] === "number") return parseYearFromNumber(o["Year"]);
    if (typeof o["Value"] === "string") return parseYearFromString(o["Value"]);
    if (typeof o["Value"] === "number") return parseYearFromNumber(o["Value"]);
  }
  return null;
}
