import React from "react";
import { Stack, Group, Select, Button, FileButton, TextInput, Textarea, Text } from "@mantine/core";
import SectionCard from "../components/ui/SectionCard";
import { LoadingBar } from "../components/ui/LoadingBar";
import { listZips, uploadZip, processZipStream } from "../lib/api";
import type { StreamProgress, ZipInfo } from "../lib/types";

export default function SyncPage() {
    const [zips, setZips] = React.useState<ZipInfo[]>([]);
    const [selected, setSelected] = React.useState<string | null>(null);
    const [password, setPassword] = React.useState("");
    const [logs, setLogs] = React.useState("");

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

    const fmtMB = (n?: number) => (n || n === 0 ? (n / (1024 * 1024)).toFixed(1) : "");

    function appendLog(line: string) {
        // newest on top
        setLogs((prev) => (prev ? `${line}\n${prev}` : line));
    }

    async function onUpload(file: File | null) {
        if (!file) return;
        setUploadBusy(true);
        setUploadPercent(0);
        setUploadSubtext(file.name);
        appendLog(`Uploading ${file.name}…`);
        try {
            const res = await uploadZip(file, (p) => setUploadPercent(p));
            appendLog(`Upload complete: ${file.name}`);
            setUploadPercent(100);

            await refresh();
            // prefer server-reported stored name
            if (res?.file) {
                setSelected(res.file);
            } else {
                const found = zips.find((z) => z.name === file.name);
                setSelected(found ? found.name : zips[0]?.name ?? null);
            }
        } catch (e: any) {
            appendLog(`ERROR during upload: ${String(e?.message || e)}`);
        } finally {
            setTimeout(() => {
                setUploadPercent(null);
                setUploadSubtext("");
                setUploadBusy(false);
            }, 250);
        }
    }

    function onProgress(p: StreamProgress) {
        if (p.phase === "unzip") {
            setExportPhase("unzip");
            setExportPercent(Math.round(p.percent ?? 0));
            setExportSubtext("");
        } else if (p.phase === "copy") {
            setExportPhase("copy");
            setExportPercent(Math.round(p.percent ?? 0));
            setExportSubtext(
                p.copiedBytes != null && p.totalBytes != null && p.deltaBytes != null
                    ? `${fmtMB(p.copiedBytes)}MB / ${fmtMB(p.totalBytes)}MB (+${fmtMB(p.deltaBytes)}MB)`
                    : ""
            );
        }
        if (p.log) appendLog(p.log);
    }

    function onRun() {
        if (!selected) return;
        setExportBusy(true);
        setLogs("");
        setExportPhase("unzip");
        setExportPercent(0);
        setExportSubtext("");

        processZipStream({
            filename: selected,
            password: password || undefined,
            onLog: appendLog,
            onProgress,
            onDone: () => {
                appendLog("DONE");
                setExportBusy(false);
                setExportPhase(null);
                setExportPercent(null);
                setExportSubtext("");
            },
            onError: (msg) => {
                appendLog(`ERROR: ${msg}`);
                setExportBusy(false);
                setExportPhase(null);
                setExportPercent(null);
                setExportSubtext("");
            },
        });
    }

    const exportPhaseLabel = exportPhase === "unzip" ? "Unzipping…" : exportPhase === "copy" ? "Copying media…" : "";

    return (
        <Stack gap="lg">
            <SectionCard title="Upload">
                <Group align="end" gap="sm" wrap="wrap">
                    <FileButton onChange={onUpload} accept=".zip">
                        {(props) => <Button {...props} variant="light" loading={uploadBusy}>Select Backup File</Button>}
                    </FileButton>
                </Group>
                <LoadingBar label="Uploading…" percent={uploadPercent} subtext={uploadSubtext} />
            </SectionCard>

            <SectionCard title="Import">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select
                        label="Select"
                        placeholder="Select Available Backup"
                        value={selected}
                        onChange={setSelected}
                        data={zips.map((z) => ({ value: z.name, label: z.name }))}
                        w={320}
                    />
                    <TextInput
                        label="DB Password (optional)"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        w={280}
                    />
                    <Button onClick={onRun} loading={exportBusy} disabled={!selected}>
                        Run import
                    </Button>
                </Group>
                <LoadingBar label={exportPhaseLabel} percent={exportPercent} subtext={exportSubtext} />
            </SectionCard>

            <SectionCard title="Logs">
                <Textarea
                    value={logs}
                    maxRows={16}
                    autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                />
                <Text size="xs" c="is-dim">
                    Newest on top
                </Text>
            </SectionCard>
        </Stack>
    );
}
