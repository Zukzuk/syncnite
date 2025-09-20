import { Persisted } from "./types";

export const GRID = {
  cols: "56px minmax(0, 40%) 60px 120px minmax(200px, 1fr)",
  minWidth: "calc(56px + 40% + 60px + 120px + 200px + 24px)",
  rowHeight: 56,
  headerHeight: 40,
};

export const Z_INDEX = {
  stickyHeader: 10,
  overlay: 20,
};

export const COOKIE = {
  libraryState: "pn_library_ui_v2",
};

export const BASE = "/data";

export const FILES = {
  games: [
    `${BASE}/games.Game.json`,
  ],
  tags: [
    `${BASE}/tags.Tag.json`,
  ],
  sources: [
    `${BASE}/sources.GameSource.json`,
    `${BASE}/sources.Source.json`,
  ],
};

export const COOKIE_DEFAULTS: Persisted = {
  q: "",
  sources: [],
  tags: [],
  showHidden: false,
  installedOnly: false,
  sortKey: "title",
  sortDir: "asc",
};

export const FALLBACK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
      <rect width='100%' height='100%' fill='#ddd'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='sans-serif' font-size='10' fill='#777'>no icon</text>
    </svg>`
  );

export function playniteAction(id: string): string { return `playnite://playnite/start/${encodeURIComponent(id)}`; };

export const sourceTrim: Record<string, string> = {
  "steam": "steam",
  "gog": "gog",
  "ubisoft connect": "ubisoft",
  "ea app": "ea",
  "battle.net": "blizzard",
  "epic": "epic",
  "xbox": "xbox",
  "humble": "humble",
  "nintendo": "nintendo",
  "microsoft store": "msstore",
};

export const sourceLabel: Record<string, string> = {
  "steam": "Steampowered",
  "gog": "Good Old Games",
  "ubisoft connect": "Ubisoft Connect",
  "ea app": "Electronic Arts",
  "battle.net": "Activision/Blizzard",
  "epic": "Epic Games",
  "xbox": "XBox",
  "humble": "Humble Bundle",
  "nintendo": "Nintendo",
  "microsoft store": "Microsoft Store",
};

export function sourceUrlFallback(s: string, id: string): string | null {
  switch (s) {
    case "steam":
      return `https://store.steampowered.com/app/${encodeURIComponent(id)}`;
    case "gog":
      return `https://www.gog.com/game/${encodeURIComponent(id)}`;
    case "ubisoft connect":
      return `https://www.ubisoft.com/en-us/search?gss-q=${encodeURIComponent(id)}`;
    case "ea app":
      return null;
    case "battle.net":
      return null;
    case "epic":
      return `https://www.epicgames.com/store/en-US/p/${encodeURIComponent(id)}`;
    case "xbox":
      return `https://www.xbox.com/en-us/Search/Results?q=${encodeURIComponent(id)}`;
    case "humble":
      return `https://www.humblebundle.com/store/search?search=${encodeURIComponent(id)}`;
    case "nintendo":
      return `https://www.nintendo.com/us/search/?q=${encodeURIComponent(id)}`;
    case "microsoft store":
      return `https://apps.microsoft.com/search?query=${encodeURIComponent(id)}`;
    default:
      return null;
  }
};

export function sourceProtocolLink(source: string, id: string): string | null {
  const s = source.toLowerCase();

  switch (s) {
    case "steam":
      // if id is numeric we can launch the game directly
      return /^\d+$/.test(id) ? `steam://rungameid/${id}` : "steam://open";
    case "gog":
    case "gog galaxy":
      return id ? `goggalaxy://openGameView/${encodeURIComponent(id)}` : "goggalaxy://openGOGGalaxy";
    case "epic":
      return id ? `com.epicgames.launcher://apps/${encodeURIComponent(id)}?action=show` : "com.epicgames.launcher://";
    case "ubisoft connect":
      return "uplay://";
    case "ea app":
      return "ealauncher://";
    case "battle.net":
      return "battlenet://";
    case "xbox":
      return "xbox://";
    default:
      return null;
  }
}

export const NOTIF_IMPORT_ID = "pn-import";

export const MAX_LINES = 1000;

export const KEY = "pn_logs_v1";

export const NOTIF_UPLOAD_ID = "pn-upload";

export const STATE_KEY = "pn_upload_state_v1";

export const LAST_UP_KEY = "pn_last_uploaded_v1";

export const IDB_DB = "pn_fs_handles";

export const IDB_STORE = "handles";

export const DB_KEY = "backupDir";
