import { PlayniteGameLink } from "./playnite";
import { PlexConnection } from "./plex";

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

export type SteamConnection = {
  apiKey: string;
  steamId?: string;
  linkedAt?: string;
};

export type Role = "admin" | "user" | "unknown";

export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type Account = {
  email: string;
  password: string;
  clientId?: string;
  steam?: SteamConnection;
  plex?: PlexConnection;
};

export type BusEvent = { type: string; data: any };
