import { BattleNetIcon, CustomIconSVG, ElectronicArtsIcon, EpicGamesIcon, GoGGalaxyIcon, SteampoweredIcon, UbisoftConnectIcon } from "../styles/CustomIcons";
import { SortDir, SortKey } from "../types/types";

export const WEB_APP_VERSION = `v${window.__APP_VERSION__}`;

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
export const FILE_BASE = "/data";

export const FILES = {
  snapshot: `${FILE_BASE}/snapshot/snapshot.json`,
};

export const SOURCE_MAP: Record<string, { 
  platform?: string; 
  online: string; 
  domains: string[], 
  label: string, 
  icon?: React.ReactNode 
}> = {
  "steam": { 
    platform: "steam://", 
    online: "store.steampowered.com",
    domains: ["steampowered.com"],
    label: "Steampowered", 
    icon: <CustomIconSVG inner={SteampoweredIcon} viewBox="0 0 32 32" />
  },
  "gog": { 
    platform: "goggalaxy://", 
    online: "www.gog.com",
    domains: ["gog.com"],
    label: "Good Old Games", 
    icon: <CustomIconSVG inner={GoGGalaxyIcon} viewBox="0 0 50 50" />,
  },
  "ubisoft connect": { 
    platform: "uplay://", 
    online: "www.ubisoft.com", 
    domains: ["ubisoft.com", "uplay"],
    label: "Ubisoft Connect", 
    icon: <CustomIconSVG inner={UbisoftConnectIcon} viewBox="0 0 24 24" />,
  },
  "ea app": { 
    platform: "link2ea://", 
    online: "www.ea.com/origin", 
    domains: ["ea.com", "origin.com"],
    label: "EA App", 
    icon: <CustomIconSVG inner={ElectronicArtsIcon} viewBox="0 0 1000 1000" />,
  },
  "battle.net": { 
    platform: "battlenet://", 
    online: "www.battle.net", 
    domains: ["battle.net", "blizzard.com"],
    label: "Battle.net", 
    icon: <CustomIconSVG inner={BattleNetIcon} viewBox="0 0 24 24" />,
  },
  "epic": { 
    platform: "com.epicgames.launcher://", 
    online: "www.epicgames.com", 
    domains: ["epicgames.com"],
    label: "Epic Games", 
    icon: <CustomIconSVG inner={EpicGamesIcon} viewBox="0 0 32 32" />,
  },
  "xbox": { 
    platform: "xbox://", 
    online: "www.xbox.com", 
    domains: ["xbox.com", "microsoft.com"],
    label: "XBox" 
  },
  "microsoft store": { 
    platform: "ms-windows-store://", 
    domains: ["microsoft.com"],
    online: "apps.microsoft.com", 
    label: "Microsoft Store" 
  },
  "humble": { 
    platform: "humble://", 
    domains: ["humblebundle.com"],
    online: "www.humblebundle.com", 
    label: "Humble Bundle" 
  },
  "nintendo": { 
    platform: "nintendo://", 
    domains: ["nintendo.com"],
    online: "www.nintendo.com", 
    label: "Nintendo" 
  },
  "abandonware": { 
    domains: ["myabandonware.com"],
    online: "www.myabandonware.com", 
    label: "Abandonware" 
  },
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
