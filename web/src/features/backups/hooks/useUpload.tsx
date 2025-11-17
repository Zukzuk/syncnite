import React from "react";
import { BackupUploader } from "../BackupUploader";
import { LogBus } from "../../../services/LogBus";

// A hook to manage the upload process of backup zip files.
export function useUpload({ onZipsChanged }: { onZipsChanged?: (name?: string) => void } = {}) {
    const [busy, setBusy] = React.useState(false);
    const [percent, setPercent] = React.useState<number | null>(null);
    const [subtext, setSubtext] = React.useState("");

    const onUpload = React.useCallback((file: File | null) => {
        if (!file) return;
        setBusy(true); setPercent(0); setSubtext(file.name);
        LogBus.append(`Uploading ${file.name}…`);
        BackupUploader.start(file);
    }, []);

    React.useEffect(() => {
        const onProg = (e: Event) => {
            const { phase, name, percent, message } = (e as CustomEvent).detail ?? {};
            if (phase === "start") { setBusy(true); setPercent(0); setSubtext(name ?? ""); }
            else if (phase === "progress") { if (typeof percent === "number") setPercent(percent); }
            else if (phase === "done") { setPercent(100); setTimeout(() => { setBusy(false); setPercent(null); setSubtext(""); }, 300); }
            else if (phase === "error") { setBusy(false); setPercent(null); setSubtext(message ?? "Upload failed"); }
        };

        const onZips = (e: Event) => {
            const name = (e as CustomEvent).detail?.name as string | undefined;
            onZipsChanged?.(name);
            LogBus.append(`SELECT ⮕ ${name}`);
        };

        window.addEventListener("pn:upload-progress", onProg);
        window.addEventListener("pn:zips-changed", onZips);
        return () => {
            window.removeEventListener("pn:upload-progress", onProg);
            window.removeEventListener("pn:zips-changed", onZips);
        };
    }, [onZipsChanged]);

    return { onUpload, busy, percent, subtext };
}
