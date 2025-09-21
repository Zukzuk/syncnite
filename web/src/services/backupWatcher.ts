// Detects newer local zips and delegates the actual upload to UploadRunner.
// Still persists the selected folder and exposes UI state.

import { BackupListener, BackupWatcherState, ZipMeta } from "../lib/types";
import { DB_KEY, IDB_DB, IDB_STORE } from "../lib/constants";
import { UploadRunner } from "./backupUploader";
import { LogBus } from "./logBus";

let dirHandle: FileSystemDirectoryHandle | null = null;
let timer: number | null = null;
const listeners = new Set<BackupListener>();
const state: BackupWatcherState = {
    supported: "showDirectoryPicker" in window,
    dirName: null,
    latestLocalZip: null,
    running: false,
    lastUploadedName: UploadRunner.getLastUploaded()?.name ?? null,
    permission: null,
};

// --- IndexedDB helpers ---
function idb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbPut<T>(key: string, val: T) {
    const db = await idb();
    await new Promise<void>((res, rej) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(val as any, key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
    });
}
async function idbGet<T>(key: string): Promise<T | null> {
    const db = await idb();
    return await new Promise<T | null>((res, rej) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => res((req.result as T) ?? null);
        req.onerror = () => rej(req.error);
    });
}
async function saveHandle(h: FileSystemDirectoryHandle | null) { await idbPut(DB_KEY, h); }
async function loadHandleFromStorage(): Promise<FileSystemDirectoryHandle | null> {
    try { return (await idbGet<FileSystemDirectoryHandle>(DB_KEY)) ?? null; } catch { return null; }
}

function emit() { listeners.forEach((fn) => fn({ ...state })); }

async function ensurePermission() {
    if (!dirHandle) { state.permission = null; emit(); return false; }
    // @ts-ignore
    const perm = await dirHandle.queryPermission?.({ mode: "read" }) as PermissionState | undefined;
    if (perm === "granted") { state.permission = "granted"; emit(); return true; }
    // @ts-ignore
    const req = await dirHandle.requestPermission?.({ mode: "read" }) as PermissionState | undefined;
    state.permission = req ?? "prompt"; emit();
    return req === "granted";
}

async function scanLatestZip(): Promise<ZipMeta | null> {
    if (!dirHandle) return null;
    let newest: ZipMeta | null = null;
    // @ts-ignore
    for await (const [name, handle] of dirHandle.entries?.() ?? []) {
        if (!name.toLowerCase().endsWith(".zip")) continue;
        // @ts-ignore
        const file = await handle.getFile?.();
        if (!file) continue;
        const meta: ZipMeta = {
            name,
            lastModified: file.lastModified ?? 0,
            size: file.size ?? 0,
        };
        if (!newest || meta.lastModified > newest.lastModified) newest = meta;
    }
    return newest;
}

function strictlyNewer(a: ZipMeta, b: { name: string; size?: number; lastModified?: number } | null) {
    if (!b) return true;
    const blm = b.lastModified ?? 0;
    if (a.lastModified > blm) return true;
    if (a.lastModified < blm) return false;
    return a.size > (b.size ?? 0);
}

async function tick() {
    if (!dirHandle) return;
    if (!(await ensurePermission())) return;

    const newest = await scanLatestZip();
    state.latestLocalZip = newest; emit();
    if (!newest) return;

    // skip if UploadRunner is already uploading that file
    if (UploadRunner.isUploadingName(newest.name)) return;

    // only prompt if strictly newer than lastUploaded known by the runner
    if (!strictlyNewer(newest, UploadRunner.getLastUploaded())) return;

    // prompt & delegate to runner
    const proceed = window.confirm(`New Playnite backup detected:\n${newest.name}\n\nUpload & import now?`);
    if (!proceed) return;

    try {
        // @ts-ignore
        const fh = await dirHandle.getFileHandle?.(newest.name);
        // @ts-ignore
        const file = await fh.getFile?.();
        if (!file) return;

        LogBus.append(`UPLOAD ▶ ${newest.name}`);
        await UploadRunner.start(file); // runner handles progress, logs, notifications, zips-changed
        state.lastUploadedName = newest.name; emit();
    } catch (e) {
        LogBus.append(`UPLOAD ✗ ${newest.name} — ${String((e as any)?.message || e)}`);
    }
}

export const BackupWatcher = {
    subscribe(fn: BackupListener) { listeners.add(fn); fn({ ...state }); return () => { listeners.delete(fn); }; },

    async selectDirectory() {
        if (!state.supported) return false;
        // @ts-ignore
        dirHandle = await (window as any).showDirectoryPicker?.();
        if (!dirHandle) return false;
        // @ts-ignore
        state.dirName = dirHandle.name ?? null;
        await saveHandle(dirHandle);
        emit();
        LogBus.append(`WATCH ▶ Selected folder: ${state.dirName}`);
        start();
        return true;
    },

    async tryRestorePrevious() {
        if (!state.supported) return false;
        const restored = await loadHandleFromStorage();
        if (!restored) return false;
        dirHandle = restored;
        // @ts-ignore
        state.dirName = dirHandle?.name ?? null;
        emit();
        LogBus.append(`WATCH ⟳ Restored folder: ${state.dirName}`);
        start();
        return true;
    },

    start, stop,
};

function start() {
    if (timer != null) return;
    state.running = true; emit();
    timer = window.setInterval(() => { tick().catch(() => { }); }, 15000);
    tick().catch(() => { });
}
function stop() {
    if (timer != null) { clearInterval(timer); timer = null; }
    state.running = false; emit();
}
