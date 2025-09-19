// web/src/lib/uploadRunner.ts
// Single source of truth for ALL uploads (manual or watcher-initiated).
// Persists state across navigation, emits progress events, logs to LogBus,
// notifies with Mantine, and announces availability via pn:zips-changed.

import { notifications } from "@mantine/notifications";
import { uploadZip } from "./api";
import { LogBus } from "../lib/logBus";
import { UploadState } from "./types";

const NOTIF_ID = "pn-upload";
const STATE_KEY = "pn_upload_state_v1";
const LAST_UP_KEY = "pn_last_uploaded_v1";

let current: UploadState = restoreState();
let lastUploaded: { name: string; size?: number; lastModified?: number } | null = restoreLast();

function emit(type: string, detail: any) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
}
function storeState() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(current)); } catch { }
}
function restoreState(): UploadState {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        if (!raw) return { running: false, name: null, percent: null };
        const obj = JSON.parse(raw);
        return {
            running: !!obj?.running,
            name: typeof obj?.name === "string" ? obj.name : null,
            percent: typeof obj?.percent === "number" ? obj.percent : null,
        };
    } catch { return { running: false, name: null, percent: null }; }
}
function storeLast(meta: { name: string; size?: number; lastModified?: number } | null) {
    try {
        if (!meta) localStorage.removeItem(LAST_UP_KEY);
        else localStorage.setItem(LAST_UP_KEY, JSON.stringify(meta));
    } catch { }
}
function restoreLast() {
    try {
        const raw = localStorage.getItem(LAST_UP_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function showRunImportNotice(fileName: string) {
    const id = `pn-upload-done-${Date.now()}`;
    notifications.show({
        id,
        title: "Backup uploaded",
        message: `Ready to import: ${fileName}. Open the Import section to run it.`,
        autoClose: 4000,
    });
}

export const UploadRunner = {
    getState(): UploadState { return { ...current }; },
    getLastUploaded(): { name: string; size?: number; lastModified?: number } | null { return lastUploaded ? { ...lastUploaded } : null; },
    isUploadingName(name: string) { return current.running && current.name === name; },

    async start(file: File) {
        if (!file) return;
        if (current.running && current.name === file.name) return;

        current = { running: true, name: file.name, percent: 0 };
        storeState();
        emit("pn:upload-state", { ...current });

        LogBus.append(`UPLOAD ▶ ${file.name}`);

        notifications.show({
            id: NOTIF_ID,
            title: "Uploading…",
            message: file.name,
            loading: true,
            autoClose: false,
        });

        // Kick progress to UI
        emit("pn:upload-progress", { phase: "start", name: file.name, percent: 0 });

        try {
            await uploadZip(file, (p: number) => {
                current.percent = p ?? current.percent ?? 0;
                storeState();
                emit("pn:upload-progress", { phase: "progress", name: file.name, percent: current.percent });
            });

            // success
            lastUploaded = {
                name: file.name,
                size: file.size,
                lastModified: (file as any)?.lastModified ?? Date.now(),
            };
            storeLast(lastUploaded);

            LogBus.append(`UPLOAD ✓ ${file.name}`);

            emit("pn:upload-progress", { phase: "done", name: file.name, percent: 100 });

            notifications.update({
                id: NOTIF_ID,
                loading: false,
                title: "Upload finished",
                message: file.name,
                autoClose: 2500,
            });

            // announce to app so /zips refresh + select happens
            window.dispatchEvent(new CustomEvent("pn:zips-changed", { detail: { name: file.name } }));
            showRunImportNotice(file.name);
        } catch (e: any) {
            LogBus.append(`UPLOAD ✗ ${file.name} — ${String(e?.message || e)}`);
            emit("pn:upload-progress", { phase: "error", name: file.name, message: String(e?.message || e) });

            notifications.update({
                id: NOTIF_ID,
                loading: false,
                color: "red",
                title: "Upload failed",
                message: String(e?.message || e),
                autoClose: 4000,
            });
        } finally {
            current = { running: false, name: null, percent: null };
            storeState();
            emit("pn:upload-state", { ...current });
        }
    },
};
