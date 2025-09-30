import { Persisted } from "./types";

export const GRID = {
  cols: "56px minmax(0, 40%) 60px 120px minmax(200px, 1fr)",
  rowHeight: 56,
  headerHeight: 40,
};

export const Z_INDEX = {
  stickyHeader: 10,
  overlay: 20,
};

export const BASE = "/data";

export const FILES = {
  localInstalled: `${BASE}/local/local.Installed.json`,
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

export const FALLBACK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
      <rect width='100%' height='100%' fill='#ddd'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='sans-serif' font-size='10' fill='#777'>no icon</text>
    </svg>`
  );

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

export const COOKIE = {
  libraryState: "pn_library_ui_v2",
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

export const MAX_LINES = 1000;

export const NOTIF_IMPORT_ID = "pn-import";

export const KEY = "pn_logs_v1";

export const NOTIF_UPLOAD_ID = "pn-upload";

export const STATE_KEY = "pn_upload_state_v1";

export const LAST_UP_KEY = "pn_last_uploaded_v1";

export const IDB_DB = "pn_fs_handles";

export const IDB_STORE = "handles";

export const DB_KEY = "backupDir";
