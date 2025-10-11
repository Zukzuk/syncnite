import axios from "axios";
import { LibraryItem, StreamProgress, ZipInfo } from "./types";

// Axios instance with base URL and credentials
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Fetch list of available ZIP backups
export async function listZips(): Promise<ZipInfo[]> {
  const r = await fetch("/api/zips");
  return r.json();
}

// Upload a ZIP file, with optional progress callback
export async function uploadZip(
  file: File,
  onProgress?: (pcent: number) => void
): Promise<{ ok: boolean; file?: string; error?: string }> {
  const form = new FormData();
  form.append("file", file);
  const r = await axios.post("/api/backup/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return r.data;
}

// Start processing a ZIP file on the server, with callbacks for log/progress/done/error
export function processZipStream({
  filename,
  password,
  onLog,
  onProgress,
  onDone,
  onError,
}: {
  filename: string;
  password?: string;
  onLog?: (msg: string) => void;
  onProgress?: (p: StreamProgress) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
}) {
  const url = new URL("/api/backup/process-stream", window.location.origin);
  url.searchParams.set("filename", filename);
  if (password) url.searchParams.set("password", password);

  const es = new EventSource(url.toString());

  let finished = false;
  const finishOnce = (cb?: () => void) => {
    if (finished) return;
    finished = true;
    try { es.close(); } catch { }
    cb?.();
  };

  // server emits named events: "log", "progress", "done", "error"
  es.addEventListener("log", (ev: MessageEvent) => {
    onLog?.(String(ev.data));
  });

  es.addEventListener("progress", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(String(ev.data)) as StreamProgress;
      onProgress?.(data);
    } catch {
      /* ignore malformed progress lines */
    }
  });

  es.addEventListener("done", () => {
    finishOnce(onDone);
  });

  // The server also emits a named "error" event with a human message.
  es.addEventListener("error", (ev: MessageEvent) => {
    // If the server sent data, prefer that. Otherwise fall back below.
    const msg = String(ev.data || "Export failed");
    finishOnce(() => onError?.(msg));
  });

  // Fallback: transport-level errors (disconnects, etc.)
  es.onerror = () => finishOnce(() => onError?.("Stream closed unexpectedly"));

  return () => finishOnce();
}

// Fetch list of library items
export async function listLibrary(): Promise<LibraryItem[]> {
  const r = await fetch("/api/library");
  return r.json();
}

// Fetch whether an admin user exists, and if so their email
export async function fetchAdminStatus(): Promise<{ hasAdmin: boolean; admin: string | null }> {
  const r = await fetch("/api/accounts/status", { cache: "no-store" });
  const j = await r.json();
  return { hasAdmin: !!j?.hasAdmin, admin: (j?.admin ?? null) as string | null };
}

// Register a new admin user
export async function registerAdmin(email: string, password: string) {
  const r = await fetch("/api/accounts/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return r.json();
}

// Login an existing user
export async function loginUser(email: string, password: string) {
  const r = await fetch("/api/accounts/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return r.json();
}