import { GameLink } from "./playnite";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        email: string;
        role: Role;
      };
    }
  }
}

// Steam

export interface SteamAppDetails {
  appid: number;
  name: string;
  type: string;

  images: {
    cover: string;
    cover2x: string;
    coverTall: string | null;

    header: string | null;
    capsule: string | null;
    capsulev5: string | null;
    capsuleSmall: string | null;
    capsuleLarge: string | null;

    wallpaper: string | null;
    hero: string | null;

    libraryCapsule: string | null;
    libraryLogo: string | null;
    libraryHero: string | null;

    icon: string | null;
  };

  price: {
    currency: string;
    initial: number;
    final: number;
    discountPercent: number;
  } | null;

  releaseDate: {
    date: string;
    comingSoon: boolean;
  } | null;

  /** GameItem–aligned derived fields */
  link: string | null;
  links: GameLink[] | null;
  year: number | null;
  tags: string[];
  series: string[];
  iconUrl: string | null;
  coverUrl: string | null;
  bgUrl: string | null;
}

export type SteamWishlistEntry = {
  appid: number;
  priority: number;
  dateAdded: string;
  details?: SteamAppDetails | null;
};

export type SteamWishlistSnapshot = {
  lastSynced: string;
  items: SteamWishlistEntry[];
  syncInProgress?: boolean;
};

export class SteamError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

// Playnite

export class PlayniteError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export type PlayniteClientManifest = {
  json?: Record<string, string[]>;
  versions?: Record<string, Record<string, string>>;
  installed?: { count: number; hash?: string };
};

export type PlayniteDeltaManifest = {
  toUpsert: Record<string, string[]>;
  toDelete: Record<string, string[]>;
};

export type InstalledStateRow = {
  id: string;
  isInstalled: boolean;
  installDirectory?: string;
  installSize?: number | null;
};

// Account

export type SteamConnection = {
  steamId: string;
  linkedAt: string;
};

export type Role = "admin" | "user" | "unknown";

export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type Account = {
  email: string;
  password: string;
  clientId?: string;
  steam?: SteamConnection;
};

export type BusEvent = { type: string; data: any };
