
export const WEB_APP_VERSION = `v${window.__APP_VERSION__}`;
export const INTERVAL_MS = 5000;
export const LETTERS_LIST = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
export const LETTERS = [...LETTERS_LIST] as const;

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
  USERS: `${API_BASE}/accounts/users`,
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

export const PUBLIC_DIR = "/mountpub";

export const FILES = {
  snapshot: { dir: `${PUBLIC_DIR}/snapshot`, file: "snapshot.json" },
  playnite: {
    installed: { dir: `${PUBLIC_DIR}/playnite/installed`, file: "installed.json" },
    libraryfiles: { dir: `${PUBLIC_DIR}/playnite/libraryfiles` }
  },
  steam: {
    installed: { dir: `${PUBLIC_DIR}/steam/installed`, file: "installed.json" },
    libraryfiles: { dir: `${PUBLIC_DIR}/steam/libraryfiles` },
    wishlist: { dir: `${PUBLIC_DIR}/steam/wishlist`, suffix: ".wishlist.json" },
  },
};

export const SOURCE_MAP: Record<string, {
  platform?: string;
  runOnPlatform?: string;
  online: string;
  domains: string[];
  label: string;
}> = {
  "steam": {
    platform: "steam://store/",
    online: `https://store.steampowered.com/app/`,
    domains: ["steampowered.com"],
    label: "Steampowered",
  },
  "gog": {
    platform: "goggalaxy://openGameView/",
    online: "https://www.gog.com/game/",
    domains: ["gog.com"],
    label: "Good Old Games",
  },
  "ubisoft connect": {
    platform: "uplay://launch/",
    online: "https://www.ubisoft.com/en-us/search?gss-q=",
    domains: ["ubisoft.com", "uplay"],
    label: "Ubisoft Connect",
  },
  "epic": {
    platform: "com.epicgames.launcher://store/product/",
    online: "https://www.epicgames.com/store/en-US/p/",
    domains: ["epicgames.com"],
    label: "Epic Games",
  },
  "ea app": {
    platform: "link2ea://",
    online: "www.ea.com/origin",
    domains: ["ea.com", "origin.com"],
    label: "EA App",
  },
  "battle.net": {
    platform: "battlenet://",
    online: "www.battle.net",
    domains: ["battle.net", "blizzard.com"],
    label: "Battle.net",
  },
  "xbox": {
    platform: "xbox://store/",
    online: "https://www.xbox.com/en-us/Search/Results?q=",
    domains: ["xbox.com", "microsoft.com"],
    label: "XBox"
  },
  "microsoft store": {
    platform: "ms-windows-store://pdp/?productid=",
    domains: ["https://microsoft.com/search?query="],
    online: "apps.microsoft.com",
    label: "Microsoft Store"
  },
  "humble": {
    platform: "humble://",
    domains: ["https://humblebundle.com/store/search?search="],
    online: "www.humblebundle.com",
    label: "Humble Bundle"
  },
  "nintendo": {
    platform: "nintendo://",
    domains: ["https://nintendo.com/us/search/?q="],
    online: "www.nintendo.com",
    label: "Nintendo"
  },
  "playnite": {
    platform: "playnite://playnite/showgame/",
    runOnPlatform: "playnite://playnite/start/",
    domains: ["playnite.com"],
    online: "www.playnite.com",
    label: "Playnite",
  },
  "abandonware": {
    online: "https://www.myabandonware.com/search/q/",
    domains: ["myabandonware.com"],
    label: "Abandonware"
  },
  "emulator": {
    online: "https://www.romsgames.net/search/?q=",
    domains: ["www.romsgames.net"],
    label: "Emulator"
  },
};