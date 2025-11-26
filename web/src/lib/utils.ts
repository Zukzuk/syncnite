import { COOKIE_DEFAULTS } from "./constants";
import type { Letter, Role, SortDir, SortKey } from "./types";
import { useComputedColorScheme, useMantineTheme } from "@mantine/core";

export function getTheme() {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const isDark = colorScheme === "dark";
  return { theme, isDark };
}

export function orderedLetters(title?: string | null, sortingName?: string | null): Letter {
  const s = (sortingName || title || "").trim();
  if (!s) return "#";
  const c = s.charAt(0).toUpperCase();
  return (c >= "A" && c <= "Z" ? c : "#") as Letter;
}

type Creds = {
  email: string;
  password: string;
  role: Role;
};

export function getCreds(): Creds | null {
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

export function setCreds(email: string, password: string, role: Role) {
  try {
    localStorage.setItem("sb_email", email.toLowerCase());
    localStorage.setItem("sb_password", password);
    localStorage.setItem("sb_role", role);
    window.dispatchEvent(new Event("sb:auth-changed"));
  } catch { }
}

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

function jsonSet<T>(key: string, value: T) {
  try {
    writeCookie(key, JSON.stringify(value));
  } catch {
    /* no-op */
  }
}

export function fetchUser(): string | null {
  try { return localStorage.getItem("sb_email"); } catch { return null; }
}

type CookieState = {
  q: string;
  sources: string[];
  tags: string[];
  series: string[];
  showHidden: boolean;
  installedOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function loadStateFromCookie(): CookieState {
  try {
    return jsonGet<CookieState>("pn_library_state", COOKIE_DEFAULTS);
  } catch {
    return COOKIE_DEFAULTS;
  }
}

export function saveStateToCookie(cookieState: CookieState) {
  jsonSet("pn_library_state", cookieState);
}
