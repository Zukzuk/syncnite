import { DB_KEY, IDB_DB, IDB_STORE } from "../../lib/constants";
import { BackupUploader } from "./BackupUploader";
import { LogBus } from "../../services/LogBus";

type ZipMeta = { 
    name: string; 
    lastModified: number;
    size: number 
};

export type BackupWatchState = {
  supported: boolean;
  dirName: string | null;
  latestLocalZip: ZipMeta | null;
  running: boolean;
  lastUploadedName: string | null;
  permission: PermissionState | "prompt" | null;
};

const defaultState: BackupWatchState = {
    supported: "showDirectoryPicker" in window,
    dirName: null,
    latestLocalZip: null,
    running: false,
    permission: null,
    lastUploadedName: BackupUploader.getLastUploaded()?.name ?? null,
};

type BackupListener = (s: BackupWatchState) => void;

const listeners = new Set<BackupListener>();
let currentState: BackupWatchState = { ...defaultState };
let dirHandle: FileSystemDirectoryHandle | null = null;
let timer: number | null = null;

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

function emit() { listeners.forEach((fn) => fn({ ...currentState })); }

async function ensurePermission() {
    if (!dirHandle) { currentState.permission = null; emit(); return false; }
    // @ts-ignore
    const perm = await dirHandle.queryPermission?.({ mode: "read" }) as PermissionState | undefined;
    if (perm === "granted") { currentState.permission = "granted"; emit(); return true; }
    // @ts-ignore
    const req = await dirHandle.requestPermission?.({ mode: "read" }) as PermissionState | undefined;
    currentState.permission = req ?? "prompt"; emit();
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
    currentState.latestLocalZip = newest; emit();
    if (!newest) return;

    // skip if BackupUploader is already uploading that file
    if (BackupUploader.isUploadingName(newest.name)) return;

    // only prompt if strictly newer than lastUploaded known by the uploader
    if (!strictlyNewer(newest, BackupUploader.getLastUploaded())) return;

    // prompt & delegate to uploader
    const proceed = window.confirm(`New Playnite backup detected:\n${newest.name}\n\nUpload & import now?`);
    if (!proceed) return;

    try {
        // @ts-ignore
        const fh = await dirHandle.getFileHandle?.(newest.name);
        // @ts-ignore
        const file = await fh.getFile?.();
        if (!file) return;

        LogBus.append(`UPLOAD ▶ ${newest.name}`);
        await BackupUploader.start(file); // runner handles progress, logs, notifications, zips-changed
        currentState.lastUploadedName = newest.name; emit();
    } catch (e) {
        LogBus.append(`UPLOAD ✗ ${newest.name} — ${String((e as any)?.message || e)}`);
    }
}

function start() {
    if (timer != null) return;
    currentState.running = true; emit();
    timer = window.setInterval(() => { tick().catch(() => { }); }, 15000);
    tick().catch(() => { });
}

function stop() {
    if (timer != null) { clearInterval(timer); timer = null; }
    currentState.running = false; emit();
}

// Detects newer local zips and delegates the actual upload to UploadRunner.
// Still persists the selected folder and exposes UI state.
export const BackupWatcher = {
    subscribe(fn: BackupListener) { 
        listeners.add(fn); 
        fn({ ...currentState }); 
        return () => { listeners.delete(fn); }; 
    },

    async selectDirectory() {
        if (!currentState.supported) return false;
        // @ts-ignore
        dirHandle = await (window as any).showDirectoryPicker?.();
        if (!dirHandle) return false;
        // @ts-ignore
        currentState.dirName = dirHandle.name ?? null;
        await saveHandle(dirHandle);
        emit();
        LogBus.append(`WATCH ▶ Selected folder: ${currentState.dirName}`);
        start();
        return true;
    },

    async tryRestorePrevious() {
        if (!currentState.supported) return false;
        const restored = await loadHandleFromStorage();
        if (!restored) return false;
        dirHandle = restored;
        // @ts-ignore
        currentState.dirName = dirHandle?.name ?? null;
        emit();
        LogBus.append(`WATCH ⟳ Restored folder: ${currentState.dirName}`);
        start();
        return true;
    },

    start, stop,
};
