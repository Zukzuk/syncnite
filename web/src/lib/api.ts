import type { StreamProgress } from "./types";

export type ZipInfo = { name: string; size: number; mtime: number };

export async function listZips(): Promise<ZipInfo[]> {
  const r = await fetch("/api/zips");
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadZip(file: File): Promise<{ ok: boolean; file?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);
  return j;
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
  const es = new EventSource(`/api/process-stream?${q.toString()}`);
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
