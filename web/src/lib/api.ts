import axios from "axios";
import { StreamProgress } from "../services/BackupImporter";
import { API_ENDPOINTS } from "./constants";
import { getCreds } from "./persist";

type LibraryItem = {
  id: string | number;
  title: string;
  platform?: string;
  addedAt?: string;
  playtimeMinutes?: number;
};

export type ZipInfo = {
  name: string;
  size: number;
  mtime: number
};

// Axios instance with base URL and credentials
export const api = axios.create({
  withCredentials: true,
});

// Fetch list of available ZIP backups
export async function listZips(): Promise<ZipInfo[]> {
  const r = await fetch(API_ENDPOINTS.ZIP_LIST);
  return r.json();
}

// Upload a ZIP file, with optional progress callback
export async function uploadZip(
  file: File,
  onProgress?: (pcent: number) => void
): Promise<{
  ok: boolean;
  file?: string;
  error?: string
}> {
  const form = new FormData();
  form.append("file", file);
  const r = await axios.post(API_ENDPOINTS.BACKUP_UPLOAD, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return r.data;
}

// Start processing a ZIP on the server, then stream logs/progress via /api/sse
export function processZipStream({
  filename, password,
  onLog, onProgress, onDone, onError,
}: {
  filename: string;
  password?: string;
  onLog?: (msg: string) => void;
  onProgress?: (p: StreamProgress) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
}) {
  let finished = false;
  let es: EventSource | null = null;

  const finishOnce = (cb?: () => void) => {
    if (finished) return;
    finished = true;
    try { es?.close(); } catch { }
    cb?.();
  };

  const controller = new AbortController();

  // Kick off the job first (POST), then attach to the shared SSE stream.
  (async () => {
    try {
      const r = await fetch(API_ENDPOINTS.ZIP_PROCESS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, ...(password ? { password } : {}) }),
        signal: controller.signal,
      });
      const payload = await r.json().catch(() => ({} as any));

      if (!r.ok || payload?.ok === false) {
        const msg = payload?.error || `Failed to start import (${r.status})`;
        return finishOnce(() => onError?.(msg));
      }

      // Now stream events (log/progress/done/error) from the server bus
      es = new EventSource(API_ENDPOINTS.SSE /* , { withCredentials: true } as any */);

      es.addEventListener("log", (ev: MessageEvent) => {
        onLog?.(String(ev.data ?? ""));
      });

      es.addEventListener("progress", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(String(ev.data)) as StreamProgress;
          onProgress?.(data);
        } catch {
          // ignore malformed progress lines
        }
      });

      es.addEventListener("done", () => {
        finishOnce(onDone);
      });

      // Named "error" events emitted by the server (human-readable message)
      es.addEventListener("error", (ev: MessageEvent) => {
        const msg = String(ev.data || "Import failed");
        finishOnce(() => onError?.(msg));
      });

      // Transport-level errors (disconnects, CORS, etc.)
      es.onerror = () => finishOnce(() => onError?.("Stream closed unexpectedly"));
    } catch (e: any) {
      finishOnce(() => onError?.(String(e?.message ?? e)));
    }
  })();

  // caller can stop early
  return () => {
    controller.abort();
    finishOnce();
  };
}


// Fetch list of library items
export async function listLibrary(): Promise<LibraryItem[]> {
  const r = await fetch(API_ENDPOINTS.LIBRARY_LIST, { cache: "no-store" });
  return r.json();
}

// Verify admin credentials are valid
export async function verifyAdmin(): Promise<boolean> {
  const c = getCreds();
  if (!c) return false;
  try {
    const r = await fetch(API_ENDPOINTS.ADMIN_VERIFY, {
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

// Fetch whether an admin user exists, and if so their email
export async function fetchAdminStatus(): Promise<{
  hasAdmin: boolean;
  admin: string | null
}> {
  const r = await fetch(API_ENDPOINTS.ADMIN_STATUS, { cache: "no-store" });
  const j = await r.json();
  return { hasAdmin: !!j?.hasAdmin, admin: (j?.admin ?? null) as string | null };
}

// Register a new admin user
export async function registerAdmin(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  error?: string
}> {
  const r = await fetch(API_ENDPOINTS.ADMIN_REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return r.json();
}

// Login an existing user
export async function loginUser(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  error?: string
}> {
  const r = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return r.json();
}