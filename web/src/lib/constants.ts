import { SortDir, SortKey } from "./types";

const API_BASE = "/api/v1";

export const API_ENDPOINTS = {
  // Fetch list of library items
  SSE: `${API_BASE}/sse`,
  ZIP_LIST: `${API_BASE}/zips`,
  // Extension management
  EXTENSION_DOWNLOAD: `${API_BASE}/extension/download`,
  EXTENSION_STATUS: `${API_BASE}/ping/status`,
  // Account management
  LOGIN: `${API_BASE}/accounts/login`,
  STATUS: `${API_BASE}/accounts/status`,
  VERIFY: `${API_BASE}/accounts/verify`,
  // User account management
  USER_REGISTER: `${API_BASE}/accounts/register/user`,
  // Admin account management
  ADMIN_REGISTER: `${API_BASE}/accounts/register/admin`,
  ADMIN_VERIFY: `${API_BASE}/accounts/verify/admin`,
  // Backup management
  BACKUP_UPLOAD: `${API_BASE}/backup/upload`,
  ZIP_PROCESS: `${API_BASE}/backup/process`,
  // Sync API
  SYNC_COLLECTION: `${API_BASE}/sync/collection/`,
}

export const GRID = {
  colsList: "40px minmax(0, 55%) 60px 95px minmax(0, 1fr)",
  colsGrid: "0px 60px 60px 95px minmax(0, 1fr)",
  rowHeight: 56,
  iconSize: 38,
  menuWidth: 160,
} as const;

export const Z_INDEX = {
  seperatorRow: 1,
  stickyHeader: 15,
  iconOverlay: 20,
  controls: 30,
  rail: 100,
} as const;

export const FILE_BASE = "/data";

export const FILES = {
  snapshot: `${FILE_BASE}/snapshot/snapshot.json`,
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
  "steam": { platform: "steam://", online: "https://store.steampowered.com", label: "Steampowered" },
  "gog": { platform: "goggalaxy://", online: "https://www.gog.com", label: "Good Old Games" },
  "ubisoft connect": { platform: "uplay://", online: "https://www.ubisoft.com", label: "Ubisoft Connect" },
  "ea app": { platform: "ealaunch://", online: "https://www.ea.com/origin", label: "EA App" },
  "battle.net": { platform: "battlenet://", online: "https://www.battle.net", label: "Battle.net" },
  "epic": { platform: "com.epicgames.launcher://", online: "https://www.epicgames.com", label: "Epic Games" },
  "xbox": { platform: "xbox://", online: "https://www.xbox.com", label: "XBox" },
  "humble": { platform: "humble://", online: "https://www.humblebundle.com", label: "Humble Bundle" },
  "nintendo": { platform: "nintendo://", online: "https://www.nintendo.com", label: "Nintendo" },
  "microsoft store": { platform: "ms-windows-store://", online: "https://apps.microsoft.com", label: "Microsoft Store" },
};

export const MAX_LINES = 1000;

export const INTERVAL_MS = 5000;

export const LETTERS_LIST = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export const LETTERS = [...LETTERS_LIST] as const;

export const COOKIE = {
  libraryState: "pn_library_ui_v2",
};

export const COOKIE_DEFAULTS = {
  q: "",
  sources: [],
  tags: [],
  series: [],
  showHidden: false,
  installedOnly: false,
  sortKey: "title" as SortKey,
  sortDir: "asc" as SortDir,
};

export const COLLECTIONS = {
  games: "games",
  companies: "companies",
  tags: "tags",
  sources: "sources",
  platforms: "platforms",
  genres: "genres",
  categories: "categories",
  features: "features",
  series: "series",
  regions: "regions",
  ageratings: "ageratings",
  completionstatuses: "completionstatuses",
  filterpresets: "filterpresets",
  importexclusions: "importexclusions",
} as const;

export const KEY_EMAIL = "sb_email";

export const KEY_PASS = "sb_password";

export const KEY_ROLE = "sb_role";

export const EVT = "sb:auth-changed";

export const NOTIF_IMPORT_ID = "pn-import";

export const KEY = "pn_logs_v1";

export const NOTIF_UPLOAD_ID = "pn-upload";

export const STATE_KEY = "pn_upload_state_v1";

export const LAST_UP_KEY = "pn_last_uploaded_v1";

export const IDB_DB = "pn_fs_handles";

export const IDB_STORE = "handles";

export const DB_KEY = "backupDir";
