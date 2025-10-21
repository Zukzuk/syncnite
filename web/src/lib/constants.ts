import { CookieState } from "./persist";

export const API_ENDPOINTS = {
  // Fetch list of library items
  LIBRARY_LIST: "/api/library",
  SSE: "/api/sse",
  ZIP_PROCESS: "/api/backup/process",
  ZIP_LIST: "/api/zips",
  // Extension management
  DOWNLOAD_EXTENSION: "/api/extension/download",
  // Admin account management
  ADMIN_VERIFY: "/api/accounts/verify",
  ADMIN_STATUS: "/api/accounts/status",
  ADMIN_REGISTER: "/api/accounts/register",
  ADMIN_LOGIN: "/api/accounts/login",
  // Backup management
  BACKUP_UPLOAD: "/api/backup/upload",
}

export const GRID = {
  cols: "56px minmax(0, 55%) 60px 95px minmax(0, 1fr)",
  rowHeight: 56,
  menuWidth: 160,
  smallBox: 40,
} as const;

export const Z_INDEX = {
  seperatorRow: 1,
  stickyHeader: 15,
  iconOverlay: 20,
  controls: 30,
  rail: 100,
} as const;

export const BASE = "/data";

export const FILES = {
  meta: `${BASE}/meta.json`,
  manifest: `${BASE}/manifest.json`,
  games: [`${BASE}/games.Game.json`],
  companies: [`${BASE}/companies.Company.json`],
  tags: [`${BASE}/tags.Tag.json`],
  sources: [`${BASE}/sources.GameSource.json`],
  platforms: [`${BASE}/platforms.Platform.json`],
  genres: [`${BASE}/genres.Genre.json`],
  categories: [`${BASE}/categories.Category.json`],
  features: [`${BASE}/features.Feature.json`],
  series: [`${BASE}/series.Series.json`],
  regions: [`${BASE}/regions.Region.json`],
  ageRatings: [`${BASE}/ageratings.AgeRating.json`],
  completionStatuses: [`${BASE}/completionstatuses.CompletionStatus.json`],
  filterPresets: [`${BASE}/filterpresets.FilterPreset.json`],
  importExclusions: [`${BASE}/importexclusions.ImportExclusion.json`]
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

export const SOURCE_MAP: Record<string, { platform: string; online: string; label: string }> = {
  "steam": {platform: "steam://", online: "https://store.steampowered.com", label: "Steampowered" },
  "gog": {platform: "goggalaxy://", online: "https://www.gog.com", label: "Good Old Games" },
  "ubisoft connect": {platform: "uplay://", online: "https://www.ubisoft.com", label: "Ubisoft Connect" },
  "ea app": {platform: "ealaunch://", online: "https://www.ea.com/origin", label: "EA App" },
  "battle.net": {platform: "battlenet://", online: "https://www.battle.net", label: "Battle.net" },
  "epic": {platform: "com.epicgames.launcher://", online: "https://www.epicgames.com", label: "Epic Games" },
  "xbox": {platform: "xbox://", online: "https://www.xbox.com", label: "XBox" },
  "humble": {platform: "humble://", online: "https://www.humblebundle.com", label: "Humble Bundle" },
  "nintendo": {platform: "nintendo://", online: "https://www.nintendo.com", label: "Nintendo" },
  "microsoft store": {platform: "ms-windows-store://", online: "https://apps.microsoft.com", label: "Microsoft Store" },
};

export const COOKIE = {
  libraryState: "pn_library_ui_v2",
};

export const COOKIE_DEFAULTS: CookieState = {
  q: "",
  sources: [],
  tags: [],
  series: [],
  showHidden: false,
  installedOnly: false,
  sortKey: "title",
  sortDir: "asc",
};

export const MAX_LINES = 1000;

export const LETTERS_LIST = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export const LETTERS = [...LETTERS_LIST] as const;

export const KEY_EMAIL = "sb_email";

export const KEY_PASS = "sb_password";

export const EVT = "sb:auth-changed";

export const NOTIF_IMPORT_ID = "pn-import";

export const KEY = "pn_logs_v1";

export const NOTIF_UPLOAD_ID = "pn-upload";

export const STATE_KEY = "pn_upload_state_v1";

export const LAST_UP_KEY = "pn_last_uploaded_v1";

export const IDB_DB = "pn_fs_handles";

export const IDB_STORE = "handles";

export const DB_KEY = "backupDir";
