import React from "react";
import { Modal, Stack, Group, Select, Button, FileButton, TextInput, Textarea, Progress, Text } from "@mantine/core";
import { listZips, uploadZip } from "../../lib/api";
import { processZipStream } from "../../lib/api";
import { type ProgressEvent } from "../../lib/types";

type ZipInfo = { name: string; size: number; mtime: number };

export function SyncDialog({
    opened,
    onClose,
    onSuccess,
}: { opened: boolean; onClose: () => void; onSuccess?: () => void }) {
    const [zips, setZips] = React.useState<ZipInfo[]>([]);
    const [selected, setSelected] = React.useState<string | null>(null);
    const [password, setPassword] = React.useState("");
    const [logs, setLogs] = React.useState("");        // static lines (non-progress)
    const [busy, setBusy] = React.useState(false);

    // live progress bars (overwrite in place)
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
        setLogs((prev) => (prev ? prev + "\n" + line : line));
    }

    function formatMB(n?: number) {
        if (!n && n !== 0) return "";
        return (n / (1024 * 1024)).toFixed(1);
    }

    function handleProgress(p: ProgressEvent) {
        if (p.phase === "unzip") {
            setUnzipPct(Math.max(0, Math.min(100, Math.round(p.percent))));
        } else if (p.phase === "copy") {
            setCopyPct(Math.max(0, Math.min(100, Math.round(p.percent))));
            setCopyStats({
                copiedMB: formatMB(p.copiedBytes),
                totalMB: formatMB(p.totalBytes),
                deltaMB: formatMB(p.deltaBytes),
            });
        }
    }

    async function onRun() {
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
                setUnzipPct(null);
                setCopyPct(null);
                setCopyStats(null);
                setBusy(false);
                onSuccess?.();
            },
            onError: (msg) => {
                appendLog(`ERROR: ${msg}`);
                setBusy(false);
            },
        });
    }

    return (
        <Modal opened={opened} onClose={onClose} title="Sync backup" size="xl">
            <Stack gap="sm">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select
                        label="Available backups"
                        placeholder="Select a ZIP"
                        value={selected}
                        onChange={setSelected}
                        data={zips.map((z) => ({ value: z.name, label: z.name }))}
                        w={360}
                    />
                    <FileButton onChange={onUpload} accept=".zip">
                        {(props) => <Button {...props} variant="light">Upload ZIP…</Button>}
                    </FileButton>
                    <TextInput
                        label="Database password (optional)"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        w={280}
                    />
                    <Button onClick={onRun} loading={busy}>Run export</Button>
                    <Button variant="outline" component="a" href="/data/" target="_blank">Open /data</Button>
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

                <Textarea
                    label="Logs"
                    value={logs}
                    minRows={12}
                    autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                />
            </Stack>
        </Modal>
    );
}
