import { notifications } from "@mantine/notifications";
import { processZipStream } from "../../lib/api";
import type { Phase } from "../../lib/types";
import { NOTIF_IMPORT_ID } from "../../lib/constants";
import { LogBus } from "../../services/LogBus";

export type StreamProgress = {
  phase?: Phase;
  percent?: number;
  copiedBytes?: number;
  totalBytes?: number;
  deltaBytes?: number;
  log?: string;
};

type BackupImportState = {
    running: boolean;
    filename: string | null;
    phase: Phase;
    percent: number | null;
    subtext?: string;
};

const defaultState: BackupImportState = {
    running: false,
    filename: null,
    phase: null,
    percent: null,
    subtext: "",
};

let currentState: BackupImportState = { ...defaultState };

let lastLoggedCopyPct = -1;

function emit(type: string, detail: any) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
}

function snapshot() {
    return { ...currentState };
}

function reset() {
    currentState = { ...defaultState };
    lastLoggedCopyPct = -1;
    emit("pn:import-state", snapshot());
}

/** 
 * A module to manage the backup import process.
 * Provides methods to start an import and track its state.
 * Emits:
 *  - "pn:import-progress" { phase: "unzip"|"copy", percent, filename, extras? }
 *  - "pn:import-state"    { snapshot of state }
 *  - "pn:import-log"      { line }
 */
export const BackupImporter = {
    getState(): BackupImportState {
        return snapshot();
    },

    async start(opts: { filename: string; password?: string }) {
        const { filename, password } = opts;
        if (!filename) return;

        // If already running for same file, ignore; if different, we "replace" (no server cancel)
        if (currentState.running && currentState.filename === filename) return;

        currentState = { running: true, filename, phase: "unzip", percent: 0, subtext: "" };
        lastLoggedCopyPct = -1;
        emit("pn:import-state", snapshot());

        LogBus.append(`IMPORT ▶ ${filename}`);

        notifications.show({
            id: NOTIF_IMPORT_ID,
            title: "Import running…",
            message: filename,
            loading: true,
            autoClose: false,
        });

        processZipStream({
            filename,
            password,
            onLog: (line: string) => {
                LogBus.append(line);
                emit("pn:import-log", { line });
            },
            onProgress: (p: StreamProgress) => {
                const phase: Phase = p.phase === "unzip" || p.phase === "copy" ? p.phase : null;
                const percent = p.percent ?? currentState.percent ?? 0;

                currentState.phase = phase;
                currentState.percent = percent;

                if (phase === "copy" && p.copiedBytes != null && p.totalBytes != null) {
                    // human-readable MB summary
                    const mb = (n: number) => (n / (1024 * 1024)).toFixed(1);
                    currentState.subtext = `${mb(p.copiedBytes)}MB / ${mb(p.totalBytes)}MB`;

                    // Throttle log line every 5%
                    const pct = Math.round(percent);
                    if (pct >= lastLoggedCopyPct + 5) {
                        LogBus.append(`COPY ${pct}% • ${currentState.subtext}`);
                        lastLoggedCopyPct = pct;
                    }
                } else {
                    currentState.subtext = "";
                }

                emit("pn:import-progress", {
                    phase: currentState.phase,
                    percent: currentState.percent,
                    filename: currentState.filename,
                    extras: { subtext: currentState.subtext },
                });
                emit("pn:import-state", snapshot());
            },
            onDone: () => {
                LogBus.append("IMPORT ✓ DONE");
                notifications.update({
                    id: NOTIF_IMPORT_ID,
                    loading: false,
                    title: "Import finished",
                    message: "Your library has been processed.",
                    autoClose: 2500,
                });
                reset();
            },
            onError: (msg: string) => {
                LogBus.append(`IMPORT ✗ ERROR: ${msg || "Unknown error"}`);
                notifications.update({
                    id: NOTIF_IMPORT_ID,
                    loading: false,
                    color: "red",
                    title: "Import failed",
                    message: msg || "Unknown error",
                    autoClose: 4000,
                });
                reset();
            },
        });
    },
};
