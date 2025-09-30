import axios from "axios";

import { LibraryItem, StreamProgress, ZipInfo } from "./types";

export const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

export async function listZips(): Promise<ZipInfo[]> {
  const r = await fetch("/api/backup/zips");
  return r.json();
}

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

export async function listLibrary(): Promise<LibraryItem[]> {
  const r = await fetch("/api/library");
  return r.json();
}
