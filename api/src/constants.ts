import { join } from "node:path";

export const LOG_LEVEL = "info"; // "info" | "debug" | "trace"
export const PING_CONNECTED_MS = 30_000;

export const PRIVATE_DIR = "/mountprv";
export const PUBLIC_DIR = "/mountpub";
export const EXT_DIR = "/extension";

export const ACCOUNTS_ROOT = join(PRIVATE_DIR, "accounts");

const PLAYNITE_ROOT = join(PUBLIC_DIR, "playnite");
export const PLAYNITE_DB_ROOT = join(PLAYNITE_ROOT, "db");
export const PLAYNITE_MEDIA_ROOT = join(PLAYNITE_ROOT, "libraryfiles");
export const PLAYNITE_INSTALLED_ROOT = join(PLAYNITE_ROOT, "installed");
export const PLAYNITE_SNAPSHOT_ROOT = join(PLAYNITE_ROOT, "snapshot");

const STEAM_ROOT = join(PUBLIC_DIR, "steam");
export const STEAM_DB_ROOT = join(STEAM_ROOT, "db");
export const STEAM_MEDIA_ROOT = join(STEAM_ROOT, "libraryfiles");
export const STEAM_INSTALLED_ROOT = join(STEAM_ROOT, "installed");
export const STEAM_WISHLIST_ROOT = join(STEAM_ROOT, "wishlist");
export const STEAM_SNAPSHOT_ROOT = join(STEAM_ROOT, "snapshot");

const PLEX_ROOT = join(PUBLIC_DIR, "plex");
export const PLEX_DB_ROOT = join(PLEX_ROOT, "db");
export const PLEX_MEDIA_ROOT = join(PLEX_ROOT, "libraryfiles");
export const PLEX_SNAPSHOT_ROOT = join(PLEX_ROOT, "snapshot");

export const ADMIN_SUFFIX = ".admin.json";
export const USER_SUFFIX = ".user.json";
export const INSTALLED_SUFFIX = ".installed.json";
export const WISHLIST_SUFFIX = ".wishlist.json";
export const SNAPSHOT_FILENAME = "snapshot.json";

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

export const PLEX_COLLECTIONS = {
    movies: "movies",
    series: "series",
    "animated-movies": "animated-movies",
    "animated-series": "animated-series",
    audiobooks: "audiobooks",
} as const;
