import { api } from "./client";
import { ZipMeta } from "./types";

export async function listZips() {
    const { data } = await api.get<ZipMeta[]>("/playnitedump/zips");
    return data;
}

export async function uploadZip(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<{ ok: boolean; file: string }>("/playnitedump/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}

export function processStreamUrl(zipName: string) {
    const p = new URLSearchParams({ zip: zipName });
    return `/api/playnitedump/process-stream?${p.toString()}`;
}
