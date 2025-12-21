
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
export const FILE_BASE = "/data";

export const FILES = {
  snapshot: { dir: `${FILE_BASE}/snapshot`, file: "snapshot.json" },
  installed: { dir: `${FILE_BASE}/installed`, file: "installed.json" },
  libraryfiles: { dir: `${FILE_BASE}/libraryfiles` },
  accounts: { dir: `${FILE_BASE}/accounts` },
};

export const INTERVAL_MS = 5000;

export const LETTERS_LIST = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export const LETTERS = [...LETTERS_LIST] as const;