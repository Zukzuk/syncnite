import { SortDir, SortKey } from "../types/types";

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
  // Playnite API
  PLAYNITE_COLLECTION: `${API_BASE}/playnite/collection/`,
  // Steam API
  STEAM_STATUS: "/api/v1/steam",
  STEAM_WISHLIST: "/api/v1/steam/wishlist",
  STEAM_WISHLIST_SYNC: "/api/v1/steam/wishlist/sync",
  STEAM_AUTH_START: "/api/v1/steam/auth/start",
}

export const GRID = {
  colsList: "40px minmax(0, 45%) 60px 95px minmax(0, 1fr)",
  colsGrid: "0px 60px 60px 95px minmax(0, 1fr)",
  navBarWidth: 140,
  coverWidth: 220,
  cardWidth: 160,
  cardHeight: 300,
  rowHeight: 60,
  halfRowHeight: 30,
  iconSize: 38,
  scrollbarWidth: 15,
  listLeftPadding: 12,
  gap: 8,
  overscan: { top: 600, bottom: 800 } as const,

} as const;

export const Z_INDEX = {
  belowBase: 0,
  base: 1,
  aboveBase: 2,
  medium: 50,
  high: 100,
  top: 1000,
} as const;

export const MAX_ASSOCIATED = 1000;

export const ASSOCIATED_CARD_STEP_Y = 60;

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

export const INTERVAL_MS = 5000;

export const LETTERS_LIST = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export const LETTERS = [...LETTERS_LIST] as const;

export const EXT_STATE_DEFAULTS = {
  connected: false,
  lastPingAt: null as string | null,
  loading: true,
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

export const PLAYNITE_COLLECTIONS = {
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
