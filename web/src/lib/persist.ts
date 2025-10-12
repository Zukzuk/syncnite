import { COOKIE, COOKIE_DEFAULTS, EVT, KEY_EMAIL, KEY_PASS } from "./constants";
import { SortDir, SortKey } from "./types";

type Creds = { 
  email: string; 
  password: string 
};

export type CookieState = {
  q: string;
  sources: string[];
  tags: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function getCreds(): Creds | null {
  try {
    const email = localStorage.getItem(KEY_EMAIL) || "";
    const password = localStorage.getItem(KEY_PASS) || "";
    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}

export function setCreds(email: string, password: string) {
  try {
    localStorage.setItem(KEY_EMAIL, email.toLowerCase());
    localStorage.setItem(KEY_PASS, password);
  } finally {
    window.dispatchEvent(new Event(EVT));
  }
}

export function clearCreds() {
  try {
    localStorage.removeItem(KEY_EMAIL);
    localStorage.removeItem(KEY_PASS);
  } finally {
    window.dispatchEvent(new Event(EVT));
  }
}

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

export function loadStateFromCookie(): CookieState {
  try {
    return jsonGet<CookieState>(COOKIE.libraryState, COOKIE_DEFAULTS);
  } catch {
    return COOKIE_DEFAULTS;
  }
}

export function saveStateToCookie(s: CookieState) {
  jsonSet(COOKIE.libraryState, s);
}

export async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${path}${sep}v=${Date.now()}`;   // cache-bust
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export async function tryLoadMany<T>(candidates: string[], fallback: T): Promise<T> {
  for (const c of candidates) {
    try { return await getJson<T>(c); } catch { /* try next */ }
  }
  return fallback;
}

export async function tryFetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const text = await r.text();
    // If nginx gave us index.html instead of JSON, bail.
    const looksHtml = ct.includes("text/html") || text.trim().startsWith("<");
    if (looksHtml) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
