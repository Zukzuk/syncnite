import type { Guidish, Link, GameDoc } from "./types";

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
