import React from "react";
import { Modal, Stack, Group, Select, Button, FileButton, TextInput, Textarea, Progress, Text } from "@mantine/core";
import { listZips, uploadZip, processZipStream } from "../../lib/api";
import { type StreamProgress } from "../../lib/types";

type ZipInfo = { name: string; size: number; mtime: number };

export function SyncDialog({
    opened, onClose, onSuccess,
}: { opened: boolean; onClose: () => void; onSuccess?: () => void }) {
    const [zips, setZips] = React.useState<ZipInfo[]>([]);
    const [selected, setSelected] = React.useState<string | null>(null);
    const [password, setPassword] = React.useState("");
    const [logs, setLogs] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [unzipPct, setUnzipPct] = React.useState<number | null>(null);
    const [copyPct, setCopyPct] = React.useState<number | null>(null);
    const [copyStats, setCopyStats] = React.useState<{ copiedMB: string; totalMB: string; deltaMB: string } | null>(null);

    const refresh = React.useCallback(async () => {
        const zs = await listZips();
        setZips(zs);
        if (!selected && zs.length) setSelected(zs[0].name);
    }, [selected]);

    React.useEffect(() => { if (opened) refresh(); }, [opened, refresh]);

    async function onUpload(file: File | null) {
        if (!file) return;
        const j = await uploadZip(file);
        await refresh();
        if (j.file) setSelected(j.file);
    }

    function appendLog(line: string) {
        setLogs((prev) => (prev ? line + "\n" + prev: line));
    }
    const fmtMB = (n?: number) => (n || n === 0 ? (n / (1024 * 1024)).toFixed(1) : "");

    function handleProgress(p: StreamProgress) {
        if (p.phase === "unzip") setUnzipPct(Math.max(0, Math.min(100, Math.round(p.percent))));
        if (p.phase === "copy") {
            setCopyPct(Math.max(0, Math.min(100, Math.round(p.percent))));
            setCopyStats({ copiedMB: fmtMB(p.copiedBytes), totalMB: fmtMB(p.totalBytes), deltaMB: fmtMB(p.deltaBytes) });
        }
    }

    function onRun() {
        if (!selected) return;
        setBusy(true);
        setLogs("");
        setUnzipPct(0);
        setCopyPct(null);
        setCopyStats(null);

        processZipStream({
            filename: selected,
            password: password || undefined,
            onLog: appendLog,
            onProgress: handleProgress,
            onDone: () => {
                appendLog("DONE");
                setBusy(false);
                setUnzipPct(null);
                setCopyPct(null);
                setCopyStats(null);
                onSuccess?.();
            },
            onError: (msg) => {
                appendLog(`ERROR: ${msg}`);
                setBusy(false);
            },
        });
    }

    return (
        <Modal opened={opened} onClose={onClose} title="Sync Playnite backup" size="xl">
            <Stack gap="sm">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select label="Select Backup" placeholder="Select a ZIP"
                        value={selected} onChange={setSelected} data={zips.map(z => ({ value: z.name, label: z.name }))} w={280} />
                    <FileButton onChange={onUpload} accept=".zip">
                        {(props) => <Button {...props} variant="light">Upload ZIP…</Button>}
                    </FileButton>
                    <TextInput label="DB Password (optional)" value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)} w={280} />
                    <Button onClick={onRun} loading={busy}>Run export</Button>
                </Group>

                {unzipPct !== null && (
                    <Stack gap={4}>
                        <Text size="sm">Unzipping… {unzipPct}%</Text>
                        <Progress value={unzipPct} />
                    </Stack>
                )}

                {copyPct !== null && (
                    <Stack gap={4}>
                        <Text size="sm">
                            Copying media… {copyPct}% {copyStats ? `(${copyStats.copiedMB}MB / ${copyStats.totalMB}MB, +${copyStats.deltaMB}MB)` : ""}
                        </Text>
                        <Progress value={copyPct} />
                    </Stack>
                )}

                <Textarea label="Logs" value={logs} maxRows={10} autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }} />
            </Stack>
        </Modal>
    );
}
