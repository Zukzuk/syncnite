import { SteamStatusResponse, SteamWishlistResponse } from "../types/app";
import { API_ENDPOINTS } from "../constants";
import { getCreds } from "./AccountService";

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
  if (!creds) return { ok: false, lastSynced: null, items: [], syncInProgress: false };

  const resp = await fetch(API_ENDPOINTS.STEAM_WISHLIST, {
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, lastSynced: null, items: [], syncInProgress: false };
  }

  const payload = await resp.json();
  return payload as SteamWishlistResponse;
}

// Trigger a sync of the Steam wishlist
export async function syncSteamWishlist(): Promise<SteamWishlistResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, lastSynced: null, items: [], syncInProgress: false };

  const resp = await fetch(API_ENDPOINTS.STEAM_WISHLIST_SYNC, {
    method: "POST",
    headers: {
      "x-auth-email": creds.email,
      "x-auth-password": creds.password,
    },
  });

  if (!resp.ok) {
    return { ok: false, lastSynced: null, items: [], syncInProgress: false };
  }

  const payload = await resp.json();
  return payload as SteamWishlistResponse;
}
