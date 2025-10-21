import React from "react";
import { Phase } from "../lib/types";
import { BackupImporter } from "../services/BackupImporter";

type ImportUi = {
    busy: boolean;
    phase: Phase;
    percent: number | null;
    subtext: string;
    logs: string;
    startImport: (args: { filename: string; password?: string }) => void;
};

export function useImporter(): ImportUi {
    const [busy, setBusy] = React.useState(false);
    const [phase, setPhase] = React.useState<Phase>(null);
    const [percent, setPercent] = React.useState<number | null>(null);
    const [subtext, setSubtext] = React.useState("");
    const [logs, setLogs] = React.useState("");

    const startImport = React.useCallback(({ filename, password }: { filename: string; password?: string }) => {
        setBusy(true); setLogs(""); setPhase("unzip"); setPercent(0); setSubtext("");
        BackupImporter.start({ filename, password });
    }, []);

    React.useEffect(() => {
        // rehydrate
        const s = BackupImporter.getState();
        if (s.running) { setBusy(true); setPhase(s.phase); setPercent(s.percent); setSubtext(s.subtext || ""); }

        const onProg = (e: Event) => {
            const { phase, percent, extras } = (e as CustomEvent).detail ?? {};
            setBusy(true);
            setPhase(phase ?? null);
            setPercent(typeof percent === "number" ? Math.round(percent) : null);
            setSubtext(extras?.subtext ?? "");
        };

        const onState = (e: Event) => {
            const st = (e as CustomEvent).detail as ReturnType<typeof BackupImporter.getState>;
            if (!st?.running) { setBusy(false); setPhase(null); setPercent(null); setSubtext(""); }
        };

        const onLog = (e: Event) => {
            const { line } = (e as CustomEvent).detail ?? {};
            if (line) setLogs(prev => (prev ? `${line}\n${prev}` : line));
        };

        window.addEventListener("pn:import-progress", onProg);
        window.addEventListener("pn:import-state", onState);
        window.addEventListener("pn:import-log", onLog);
        return () => {
            window.removeEventListener("pn:import-progress", onProg);
            window.removeEventListener("pn:import-state", onState);
            window.removeEventListener("pn:import-log", onLog);
        };
    }, []);

    return { busy, phase, percent, subtext, logs, startImport };
}
