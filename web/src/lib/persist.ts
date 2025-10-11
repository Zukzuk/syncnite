import { COOKIE, COOKIE_DEFAULTS, EVT, KEY_EMAIL, KEY_PASS } from "./constants";
import { Creds, Persisted } from "./types";

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

export async function verify(): Promise<boolean> {
  const c = getCreds();
  if (!c) return false;
  try {
    const r = await fetch("/api/accounts/verify", {
      headers: {
        "x-auth-email": c.email,
        "x-auth-password": c.password,
      },
      cache: "no-store",
    });
    const j = await r.json();
    return !!j?.ok;
  } catch {
    return false;
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
