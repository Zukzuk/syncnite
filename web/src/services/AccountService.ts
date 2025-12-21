import { AccountCreds, CookieState, Creds, Role, SortDir, SortKey } from "../types/types";
import { API_ENDPOINTS } from "../constants";

// Login with email and password
export async function login(body: Creds): Promise<{
    ok: boolean; email: string; role: Role; error?: string
}> {
    const resp = await fetch(API_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    return resp.json();
}

// Register a new admin user
export async function registerAdmin(body: Creds): Promise<{
    ok: boolean; email: string; error?: string
}> {
    const resp = await fetch(API_ENDPOINTS.ADMIN_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    return resp.json();
}

// Register a new user
export async function registerUser(body: Creds): Promise<{
    ok: boolean; email: string; error?: string
}> {
    const resp = await fetch(API_ENDPOINTS.USER_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    return resp.json();
}

// Verify current session credentials
export async function verifySession(): Promise<{
    ok: boolean; email?: string; role?: string
}> {
    const creds = getCreds();
    if (!creds) return { ok: false };

    const resp = await fetch(API_ENDPOINTS.VERIFY, {
        headers: {
            "x-auth-email": creds.email,
            "x-auth-password": creds.password,
        },
    });

    if (!resp.ok) return { ok: false };
    const payload = await resp.json();

    return { ok: true, ...payload };
}

// Fetch whether an admin user exists, and if so their email
export async function fetchAdminStatus(): Promise<{
    hasAdmin: boolean;
}> {
    const resp = await fetch(API_ENDPOINTS.STATUS, { cache: "no-store" });
    const payload = await resp.json();

    return { hasAdmin: !!payload?.hasAdmin };
}

// Fetch the list of all user accounts (admin and user)
export async function fetchUsers(): Promise<AccountCreds[]> {
  const creds = getCreds();
  if (!creds) throw new Error("Not logged in");

  const r = await fetch(API_ENDPOINTS.USERS, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
    cache: "no-cache",
  });

  if (!r.ok) {
    const body = await r.json().catch(() => null);
    const msg = body?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  const json = await r.json().catch(() => null);
  const users = json?.users;

  if (!Array.isArray(users)) return [];
  return users as AccountCreds[];
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

// Fetches JSON data from a given URL
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
    const cookie = {
        q: "",
        sources: [],
        tags: [],
        series: [],
        showHidden: false,
        installedOnly: false,
        sortKey: "title" as SortKey,
        sortDir: "asc" as SortDir,
    }
    try {
        const raw = readCookie("pn_library_state");
        if (!raw) return cookie;
        return JSON.parse(raw) as CookieState;
    } catch {
        return cookie;
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
