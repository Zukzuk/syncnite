// Centralized "Run import" controller that survives route changes.
// Emits:
//  - "pn:import-progress" { phase: "unzip"|"copy"|null, percent, filename, extras? }
//  - "pn:import-log"      { line }
//  - "pn:import-state"    { snapshot of state }

import { notifications } from "@mantine/notifications";
import { processZipStream } from "../lib/api";
import type { ImportState, Phase, StreamProgress } from "../lib/types";
import { NOTIF_IMPORT_ID } from "../lib/constants";
import { LogBus } from "./logBus";

let current: ImportState = {
    running: false,
    filename: null,
    phase: null,
    percent: null,
    subtext: "",
};

let lastLoggedCopyPct = -1;

function emit(type: string, detail: any) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
}
function snapshot() {
    return { ...current };
}
function reset() {
    current = { running: false, filename: null, phase: null, percent: null, subtext: "" };
    lastLoggedCopyPct = -1;
    emit("pn:import-state", snapshot());
}

export const ImportRunner = {
    getState(): ImportState {
        return snapshot();
    },

    async start(opts: { filename: string; password?: string }) {
        const { filename, password } = opts;
        if (!filename) return;

        // If already running for same file, ignore; if different, we "replace" (no server cancel)
        if (current.running && current.filename === filename) return;

        current = { running: true, filename, phase: "unzip", percent: 0, subtext: "" };
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
                const percent = p.percent ?? current.percent ?? 0;

                current.phase = phase;
                current.percent = percent;

                if (phase === "copy" && p.copiedBytes != null && p.totalBytes != null) {
                    // human-readable MB summary
                    const mb = (n: number) => (n / (1024 * 1024)).toFixed(1);
                    current.subtext = `${mb(p.copiedBytes)}MB / ${mb(p.totalBytes)}MB`;

                    // Throttle log line every 5%
                    const pct = Math.round(percent);
                    if (pct >= lastLoggedCopyPct + 5) {
                        LogBus.append(`COPY ${pct}% • ${current.subtext}`);
                        lastLoggedCopyPct = pct;
                    }
                } else {
                    current.subtext = "";
                }

                emit("pn:import-progress", {
                    phase: current.phase,
                    percent: current.percent,
                    filename: current.filename,
                    extras: { subtext: current.subtext },
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
