import { Creds, Role, SteamStatusResponse, SteamWishlistResponse } from "../types/types";
import { API_ENDPOINTS } from "./constants";
import { getCreds } from "./utils";

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

// Load a DB collection via the API
export async function loadDbCollection<T>(collection: string): Promise<T[]> {
  const url = `${API_ENDPOINTS.PLAYNITE_COLLECTION}${encodeURIComponent(collection)}`;

  try {
    const creds = getCreds();
    if (!creds) throw new Error("No credentials");

    const resp = await fetch(url, {
      headers: {
        "x-auth-email": creds.email,
        "x-auth-password": creds.password,
      },
    });

    const text = await resp.text();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to load DB collection:", e);
    return [];
  }
}

// Fetch the status of the browser extension connection
export async function fetchExtensionStatus(): Promise<{
  ok: boolean; connected: boolean; lastPingAt: string | null;
}> {
  const creds = getCreds();
  if (!creds) return { ok: false, connected: false, lastPingAt: null };

  const resp = await fetch(API_ENDPOINTS.EXTENSION_STATUS, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, connected: false, lastPingAt: null };
  }

  const payload = await resp.json();
  return payload;
}

// Fetch types for Steam API responses
export async function fetchSteamStatus(): Promise<SteamStatusResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, connected: false };

  const resp = await fetch(API_ENDPOINTS.STEAM_STATUS, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, connected: false };
  }

  const payload = await resp.json();
  return payload as SteamStatusResponse;
}

// Fetch the user's Steam wishlist
export async function fetchSteamWishlist(): Promise<SteamWishlistResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, lastSynced: null, items: [] };

  const resp = await fetch(API_ENDPOINTS.STEAM_WISHLIST, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, lastSynced: null, items: [] };
  }

  const payload = await resp.json();
  return payload as SteamWishlistResponse;
}

// Trigger a sync of the Steam wishlist
export async function syncSteamWishlist(): Promise<SteamWishlistResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, lastSynced: null, items: [] };

  const resp = await fetch(API_ENDPOINTS.STEAM_WISHLIST_SYNC, {
    method: "POST",
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, lastSynced: null, items: [] };
  }

  const payload = await resp.json();
  return payload as SteamWishlistResponse;
}
