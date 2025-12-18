import { COOKIE_DEFAULTS } from "./constants";
import type { AccountCreds, CookieState, Letter, Role } from "../types/types";

// Returns the first letter for ordering purposes
export function orderedLetters(title?: string | null, sortingName?: string | null): Letter {
  const s = (sortingName || title || "").trim();
  if (!s) return "#";
  const c = s.charAt(0).toUpperCase();
  return (c >= "A" && c <= "Z" ? c : "#") as Letter;
}

// Functions to get, set, and clear account credentials in localStorage
export function getCreds(): AccountCreds | null {
  try {
    const email = localStorage.getItem("sb_email");
    const password = localStorage.getItem("sb_password");
    const role = localStorage.getItem("sb_role") as Role | null;
    if (!email || !password || !role) return null;
    return { email, password, role };
  } catch {
    return null;
  }
}

// Sets account credentials and dispatches an auth-changed event
export function setCreds(email: string, password: string, role: Role) {
  try {
    localStorage.setItem("sb_email", email.toLowerCase());
    localStorage.setItem("sb_password", password);
    localStorage.setItem("sb_role", role);
    window.dispatchEvent(new Event("sb:auth-changed"));
  } catch { }
}

// Clears account credentials and dispatches an auth-changed event
export function clearCreds() {
  try {
    localStorage.removeItem("sb_email");
    localStorage.removeItem("sb_password");
    localStorage.removeItem("sb_role");
    window.dispatchEvent(new Event("sb:auth-changed"));
  } catch { }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 180) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function jsonGet<T>(key: string, fallback: T): T {
  try {
    const raw = readCookie(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function fetchJson(url: string): Promise<any | null> {
    try {
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) return null;
        const text = await r.text();
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// Fetches the stored user email from localStorage
export function fetchUser(): string | null {
  try { return localStorage.getItem("sb_email"); } catch { return null; }
}

// Loads the library state from a cookie
export function loadStateFromCookie(): CookieState {
  try {
    return jsonGet<CookieState>("pn_library_state", COOKIE_DEFAULTS);
  } catch {
    return COOKIE_DEFAULTS;
  }
}

// Saves the library state to a cookie
export function saveStateToCookie(cookieState: CookieState) {
  try {
    writeCookie("pn_library_state", JSON.stringify(cookieState));
  } catch {
    /* no-op */
  }
}
