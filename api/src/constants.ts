import { join } from "node:path";

export const LOG_LEVEL = "info"; // "info" | "debug" | "trace"
export const PING_CONNECTED_MS = 30_000;

export const PRIVATE_DIR = "/mountprv";
export const PUBLIC_DIR = "/mountpub";
export const EXT_DIR = "/extension";

export const ACCOUNTS_ROOT = join(PRIVATE_DIR, "accounts");

export const SNAPSHOT_ROOT = join(PUBLIC_DIR, "snapshot");

const PLAYNITE_ROOT = join(PUBLIC_DIR, "playnite");
export const PLAYNITE_DB_ROOT = join(PLAYNITE_ROOT, "db");
export const PLAYNITE_MEDIA_ROOT = join(PLAYNITE_ROOT, "libraryfiles");
export const PLAYNITE_INSTALLED_ROOT = join(PLAYNITE_ROOT, "installed");

const STEAM_ROOT = join(PUBLIC_DIR, "steam");
export const STEAM_MEDIA_ROOT = join(STEAM_ROOT, "libraryfiles");
export const STEAM_INSTALLED_ROOT = join(STEAM_ROOT, "installed");
export const STEAM_WISHLIST_ROOT = join(STEAM_ROOT, "wishlist");

export const ADMIN_SUFFIX = ".admin.json";
export const USER_SUFFIX = ".user.json";
export const INSTALLED_SUFFIX = ".installed.json";
export const WISHLIST_SUFFIX = ".wishlist.json";

export const PLAYNITE_COLLECTIONS = new Set([
    "games",
    "companies",
    "tags",
    "sources",
    "platforms",
    "genres",
    "categories",
    "features",
    "series",
    "regions",
    "ageratings",
    "completionstatuses",
    "filterpresets",
    "importexclusions",
]);