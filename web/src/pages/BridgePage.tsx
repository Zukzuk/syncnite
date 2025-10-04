import React from "react";
import { Stack, Group, Select, Button, FileButton, PasswordInput, Textarea, Text } from "@mantine/core";
import SectionCard from "../components/ui/SectionCard";
import { LoadingBar } from "../components/ui/LoadingBar";
import { listZips } from "../lib/api";
import type { BackupWatcherState, ZipInfo } from "../lib/types";
import { LogBus } from "../services/logBus";
import { BackupWatcher } from "../services/backupWatcher";
import { ImportRunner } from "../services/backupImporter";
import { UploadRunner } from "../services/backupUploader";

export default function BridgePage() {
    const [zips, setZips] = React.useState<ZipInfo[]>([]);
    const [selected, setSelected] = React.useState<string | null>(null);
    const [password, setPassword] = React.useState("");
    const [logs, setLogs] = React.useState("");
    const [watch, setWatch] = React.useState<BackupWatcherState | null>(null);

    // Upload-only progress
    const [uploadBusy, setUploadBusy] = React.useState(false);
    const [uploadPercent, setUploadPercent] = React.useState<number | null>(null);
    const [uploadSubtext, setUploadSubtext] = React.useState<string>("");

    // Export-only progress
    const [exportBusy, setExportBusy] = React.useState(false);
    const [exportPhase, setExportPhase] = React.useState<null | "unzip" | "copy">(null);
    const [exportPercent, setExportPercent] = React.useState<number | null>(null);
    const [exportSubtext, setExportSubtext] = React.useState<string>("");

    const refresh = React.useCallback(async () => {
        const zs = await listZips();
        setZips(zs);
        if (!selected && zs.length) setSelected(zs[0].name);
    }, [selected]);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    React.useEffect(() => {
        const unsub = BackupWatcher.subscribe(setWatch);
        return () => {
            unsub();            // ensure the cleanup returns void
        };
    }, []);

    React.useEffect(() => {
        const onProg = (e: Event) => {
            const { phase, name, percent, message } = (e as CustomEvent).detail ?? {};
            if (phase === "start") {
                setUploadBusy(true);
                setUploadPercent(0);
                setUploadSubtext(name ?? "");
            } else if (phase === "progress") {
                if (typeof percent === "number") setUploadPercent(percent);
            } else if (phase === "done") {
                setUploadPercent(100);
                setTimeout(() => {
                    setUploadBusy(false);
                    setUploadPercent(null);
                    setUploadSubtext("");
                }, 300);
            } else if (phase === "error") {
                setUploadBusy(false);
                setUploadPercent(null);
                setUploadSubtext(message ?? "Upload failed");
            }
        };

        const onZipsChanged = (e: Event) => {
            const name = (e as CustomEvent).detail?.name as string | undefined;
            (async () => {
                await refresh();                    // refresh the /zips list
                if (name) setSelected(name);        // auto-select newest
                LogBus.append(`SELECT ⮕ ${name}`); // ← add this
            })();
        };

        window.addEventListener("pn:upload-progress", onProg);
        window.addEventListener("pn:zips-changed", onZipsChanged);
        return () => {
            window.removeEventListener("pn:upload-progress", onProg);
            window.removeEventListener("pn:zips-changed", onZipsChanged);
        };
    }, [refresh, setSelected]);

    async function onUpload(file: File | null) {
        if (!file) return;
        // instantaneous local feedback; events will keep it updated
        setUploadBusy(true);
        setUploadPercent(0);
        setUploadSubtext(file.name);
        LogBus.append(`Uploading ${file.name}…`);
        UploadRunner.start(file);
    }

    function onRun() {
        if (!selected) return;

        // clear page UI; runner will drive it from here
        setExportBusy(true);
        setLogs("");
        setExportPhase("unzip");
        setExportPercent(0);
        setExportSubtext("");

        ImportRunner.start({ filename: selected, password: password || undefined });
    }

    React.useEffect(() => {
        // Rehydrate current state on mount/route return
        const s = ImportRunner.getState();
        if (s.running) {
            setExportBusy(true);
            setExportPhase(s.phase);
            setExportPercent(s.percent);
            setExportSubtext(s.subtext || "");
        } else {
            setExportBusy(false);
            setExportPhase(null);
            setExportPercent(null);
            setExportSubtext("");
        }

        const onProg = (e: Event) => {
            const { phase, percent, extras } = (e as CustomEvent).detail ?? {};
            setExportBusy(true);
            setExportPhase(phase ?? null);
            setExportPercent(typeof percent === "number" ? Math.round(percent) : null);
            setExportSubtext(extras?.subtext ?? "");
        };

        const onState = (e: Event) => {
            const st = (e as CustomEvent).detail as ReturnType<typeof ImportRunner.getState>;
            if (!st?.running) {
                // finished or error
                setExportBusy(false);
                setExportPhase(null);
                setExportPercent(null);
                setExportSubtext("");
            }
        };

        const onLog = (e: Event) => {
            const { line } = (e as CustomEvent).detail ?? {};
            if (line) setLogs((prev) => (prev ? `${line}\n${prev}` : line));
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

    const exportPhaseLabel = exportPhase === "unzip" ? "Unzipping…" : exportPhase === "copy" ? "Copying media…" : "";

    return (
        <Stack gap="lg" p="md">
            <Text fz={24} fw={700}>Shared</Text>

            <SectionCard title="Shared library location">
                <Group gap="sm" wrap="wrap" align="center">
                    <FileButton onChange={onUpload} accept=".zip">
                        {(props) => (
                            <Button {...props} variant="light" loading={uploadBusy}>
                                Select manually
                            </Button>
                        )}
                    </FileButton>

                    <Button
                        variant="subtle"
                        onClick={() => BackupWatcher.selectDirectory()}
                        disabled={!watch?.supported}
                        title={
                            watch?.supported
                                ? "Pick your Playnite backup folder to monitor"
                                : "Browser not supported"
                        }
                    >
                        Watch location
                    </Button>

                    <Text
                        size="sm"
                        className="is-dim"
                        style={{ whiteSpace: "nowrap", alignSelf: "center" }}
                    >
                        {watch?.dirName
                            ? `/${watch.dirName}`
                            : "Not watching a folder"}
                    </Text>
                </Group>

                <LoadingBar
                    label="Uploading…"
                    percent={uploadPercent}
                    subtext={uploadSubtext}
                />
            </SectionCard>

            <SectionCard title="Import">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select
                        label="Select"
                        placeholder="Select Available Backup"
                        value={selected}
                        onChange={setSelected}
                        data={zips.map((z) => ({ value: z.name, label: z.name }))}
                        w={360}
                    />
                    <PasswordInput
                        label="DB Password (optional)"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        w={200}
                    />
                    <Button onClick={onRun} loading={exportBusy} disabled={!selected} variant="light">
                        Run import
                    </Button>
                </Group>
                <LoadingBar label={exportPhaseLabel} percent={exportPercent} subtext={exportSubtext} />
            </SectionCard>

            <SectionCard title="Logs">
                <Textarea
                    value={logs}
                    maxRows={10}
                    autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                />
                <Text size="xs" className="is-dim">
                    Newest on top
                </Text>
            </SectionCard>
        </Stack>
    );
}
