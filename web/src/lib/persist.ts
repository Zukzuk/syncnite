import { COOKIE, COOKIE_DEFAULTS } from "./constants";
import { Persisted } from "./types";

export function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 180) {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

export function jsonGet<T>(key: string, fallback: T): T {
    try {
        const raw = readCookie(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function jsonSet<T>(key: string, value: T) {
    try {
        writeCookie(key, JSON.stringify(value));
    } catch {
        /* no-op */
    }
}

export function getEmail(): string | null {
  try { return localStorage.getItem("sb_email"); } catch { return null; }
}

export function loadStateFromCookie(): Persisted {
  try {
    return jsonGet<Persisted>(COOKIE.libraryState, COOKIE_DEFAULTS);
  } catch {
    return COOKIE_DEFAULTS;
  }
}

export function saveStateToCookie(s: Persisted) {
  jsonSet(COOKIE.libraryState, s);
}
