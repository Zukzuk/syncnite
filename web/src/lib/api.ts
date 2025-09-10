import axios from "axios";
import type { StreamProgress } from "./types";

export type ZipInfo = { name: string; size: number; mtime: number };

export async function listZips(): Promise<ZipInfo[]> {
  const r = await fetch("/api/playnitedump/zips");
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadZip(file: File, onProgress?: (p: number) => void) {
  const formData = new FormData();
  formData.append("file", file);

  await axios.post("/api/playnitedump/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total) {
        const percent = Math.round((e.loaded * 100) / e.total);
        onProgress?.(percent);
      }
    },
  });
}

export function processZipStream(params: {
  filename: string;
  password?: string;
  onLog: (line: string) => void;
  onProgress: (p: StreamProgress) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const { filename, password, onLog, onProgress, onDone, onError } = params;
  const q = new URLSearchParams({ filename, ...(password ? { password } : {}) });
  const es = new EventSource(`/api/playnitedump/process-stream?${q.toString()}`);
  const close = () => es.close();

  es.addEventListener("log", (ev: MessageEvent) => onLog((ev.data || "").replace(/\\n/g, "\n")));
  es.addEventListener("progress", (ev: MessageEvent) => {
    try { onProgress(JSON.parse(ev.data) as StreamProgress); } catch { /* ignore */ }
  });
  es.addEventListener("done", () => { onDone(); close(); });
  es.addEventListener("error", (ev: MessageEvent) => { onError((ev as any).data || "stream error"); close(); });
  es.onerror = () => { onError("connection lost"); close(); };

  return { close };
}
