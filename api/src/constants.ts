import { join } from "node:path";

export const LOG_LEVEL = "info"; // "info" | "debug" | "trace"
export const PING_CONNECTED_MS = 30_000;

export const DATA_DIR = "/data";
export const EXT_DIR = "/extension";
export const ACCOUNTS_ROOT = join(DATA_DIR, "accounts");
export const DB_ROOT = join(DATA_DIR, "db");
export const MEDIA_ROOT = join(DATA_DIR, "libraryfiles");
export const INSTALLED_ROOT = join(DATA_DIR, "installed");
export const SNAPSHOT_ROOT = join(DATA_DIR, "snapshot");
export const STEAM_ROOT = join(DATA_DIR, "steam");

export const ADMIN_SUFFIX = ".admin.json";
export const USER_SUFFIX = ".user.json";

export const COLLECTIONS = new Set([
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