import ICO from "icojs";
import { BASE, FALLBACK_ICON, SOURCE_MAP } from "./constants";
import type { Letter } from "./types";
import {
  IconBrandSteam,
  IconBox as IconBrandGog,
  IconShieldChevron as IconBrandEpicGames,
  IconBrandFacebook,
  IconBrandTwitter,
  IconBrandInstagram,
  IconBrandYoutube,
  IconBrandDiscord,
  IconBrandTwitch,
  IconBrandWikipedia,
  IconWorldWww,
} from "@tabler/icons-react";
import { GameLink } from "../types/playnite";
import { useComputedColorScheme, useMantineTheme } from "@mantine/core";

export function getTheme() {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const isDark = colorScheme === "dark";
  return { theme, isDark };
}

export function isIcoPath(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return /\.ico(\?|#|$)/i.test(u.pathname);
  } catch {
    return /\.ico(\?|#|$)/i.test(url);
  }
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

export function normalizePath(p?: string): string | null {
  if (!p) return null;
  return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function buildIconUrl(iconRel: string | null, iconId: string | null): string {
  if (iconRel && /^https?:\/\//i.test(iconRel)) return iconRel;
  if (iconRel) {
    const rel = iconRel.replace(/\\/g, "/").replace(/^\.?\//, "");
    const path = rel.startsWith("libraryfiles/") ? rel : `libraryfiles/${rel}`;
    return `${BASE}/${path}`;
  }
  if (iconId) return `${BASE}/libraryfiles/${iconId}.png`;
  return FALLBACK_ICON;
}

export const iconForSource = (s: string | null | undefined) => {
  const key = (s ?? "").toLowerCase();
  if (key.includes("steam")) return IconBrandSteam;
  if (key.includes("gog")) return IconBrandGog;
  if (key.includes("epic")) return IconBrandEpicGames;
  if (key.includes("facebook")) return IconBrandFacebook;
  if (key.includes("twitter") || key.includes("x")) return IconBrandTwitter;
  if (key.includes("instagram")) return IconBrandInstagram;
  if (key.includes("youtube")) return IconBrandYoutube;
  if (key.includes("discord")) return IconBrandDiscord;
  if (key.includes("twitch")) return IconBrandTwitch;
  if (key.includes("wikipedia")) return IconBrandWikipedia;
  return IconWorldWww;
};

export function findSourcishLink(links: GameLink[] | undefined, sourceName: string): string | null {
  if (!links || links.length === 0) return null;

  const source = sourceName.toLowerCase();

  // Try to find a link whose name directly matches or refers to a "store"
  const preferredLink = links.find(link => {
    const name = (link.Name ?? "").toLowerCase();
    return name === "store" || name === source || name.includes("store");
  });

  if (preferredLink?.Url) return preferredLink.Url;

  // Try to match based on known domain patterns for common stores/platforms
  const domainMatches: Record<string, string[]> = {
    steam: ["steampowered.com"],
    epic: ["epicgames.com"],
    gog: ["gog.com"],
    ubisoft: ["ubisoft.com", "uplay"],
    ea: ["ea.com", "origin.com"],
    battle: ["battle.net", "blizzard.com"],
    xbox: ["xbox.com", "microsoft.com"],
    humble: ["humblebundle.com"],
    nintendo: ["nintendo.com"]
  };

  const matchedLink = links.find(link => {
    const url = (link.Url ?? "").toLowerCase();
    return Object.entries(domainMatches).some(([key, domains]) =>
      source.includes(key) && domains.some(domain => url.includes(domain))
    );
  });

  return matchedLink?.Url ?? null;
}

export function sourcishLinkFallback(source: string, id: string): string | null {
  const s = source.toLowerCase();
  switch (s) {
    case "steam":
      return `${SOURCE_MAP.steam.online}/app/${encodeURIComponent(id)}`;

    case "gog":
      return `${SOURCE_MAP.gog.online}/game/${encodeURIComponent(id)}`;

    case "ubisoft connect":
    case "uplay":
    case "ubisoft":
      return `${SOURCE_MAP["ubisoft connect"].online}/en-us/search?gss-q=${encodeURIComponent(id)}`;

    case "ea app":
      return null;

    case "battle.net":
      return null;

    case "epic":
      return `${SOURCE_MAP.epic.online}/store/en-US/p/${encodeURIComponent(id)}`;

    case "xbox":
      return `${SOURCE_MAP.xbox.online}/en-us/Search/Results?q=${encodeURIComponent(id)}`;

    case "humble":
      return `${SOURCE_MAP.humble.online}/store/search?search=${encodeURIComponent(id)}`;

    case "nintendo":
      return `${SOURCE_MAP.nintendo.online}/us/search/?q=${encodeURIComponent(id)}`;

    case "microsoft store":
      return `${SOURCE_MAP["microsoft store"].online}/search?query=${encodeURIComponent(id)}`;

    default:
      return null;
  }
};

export function sourceProtocolLink(source: string, gameId: string | null, href: string | null): string | null {
  if (!source || !gameId) return null;
  const s = source.toLowerCase();

  switch (s) {
    case "steam":
      return `${SOURCE_MAP.steam.platform}store/${encodeURIComponent(gameId)}`;

    case "gog":
      return `${SOURCE_MAP.gog.platform}openGameView/${encodeURIComponent(gameId)}`;

    case "epic": {
      // get epic slug after product/ or p/ from href if possible
      const slug = href?.match(/\/product\/([^/?]+)/)?.[1] || href?.match(/\/p\/([^/?]+)/)?.[1];
      return slug ? `${SOURCE_MAP.epic.platform}store/product/${encodeURIComponent(slug)}?action=show` : `${SOURCE_MAP.epic.platform}`;
      //return `com.epicgames.launcher://store/product/${encodeURIComponent(gameId)}?action=show`;
    }

    case "ubisoft connect":
    case "uplay":
    case "ubisoft":
      return `${SOURCE_MAP["ubisoft connect"].platform}launch/${encodeURIComponent(gameId)}/0`;

    case "ea app":
      return `${SOURCE_MAP["ea app"].platform}launchbyname/${encodeURIComponent(gameId)}`;

    case "battle.net":
      return `${SOURCE_MAP["battle.net"].platform}${encodeURIComponent(gameId)}`;

    case "xbox":
      return `${SOURCE_MAP.xbox.platform}store/${encodeURIComponent(gameId)}`;

    case "humble":
      return null;

    case "nintendo":
      return null;

    case "microsoft store":
      return `${SOURCE_MAP["microsoft store"].platform}pdp/?productid=${encodeURIComponent(gameId)}`;

    default:
      return null;
  }
}

export function hasEmulatorTag(tags?: string[]): boolean {
  return Array.isArray(tags) && tags.some(t => /\bemulator(s)?\b/i.test(t));
}

export function myAbandonwareLink(title: string): string {
  return `https://www.myabandonware.com/search/q/${encodeURIComponent(title)}`;
}

export function playniteAction(id: string): string {
  return `playnite://playnite/start/${encodeURIComponent(id)}`;
}
// deprecated
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
    // Sync style
    if (typeof o["ReleaseDate"] === "string") return parseYearFromString(o["ReleaseDate"]);
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

export function orderedLetters(title?: string | null, sortingName?: string | null): Letter {
  const s = (sortingName || title || "").trim();
  if (!s) return "#";
  const c = s.charAt(0).toUpperCase();
  return (c >= "A" && c <= "Z" ? c : "#") as Letter;
}

export function buildAssetUrl(rel?: string | null): string | null {
  if (!rel) return null;
  const norm = normalizePath(rel);
  if (!norm) return null;
  if (/^https?:\/\//i.test(norm)) return norm;
  const path = norm.startsWith("libraryfiles/") ? norm : `libraryfiles/${norm}`;
  return `${BASE}/${path}`;
}