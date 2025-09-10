// web/src/components/sync/SyncDialog.tsx
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

    // unified bar
    const [phase, setPhase] = React.useState<null | "upload" | "unzip" | "copy">(null);
    const [percent, setPercent] = React.useState<number | null>(null);
    const [subtext, setSubtext] = React.useState<string>("");

    const refresh = React.useCallback(async () => {
        const zs = await listZips();
        setZips(zs);
        if (!selected && zs.length) setSelected(zs[0].name);
    }, [selected]);

    React.useEffect(() => { if (opened) refresh(); }, [opened, refresh]);

    function appendLog(line: string) {
        // top-append
        setLogs((prev) => (prev ? `${line}\n${prev}` : line));
    }

    const fmtMB = (n?: number) => (n || n === 0 ? (n / (1024 * 1024)).toFixed(1) : "");

    async function onUpload(file: File | null) {
        if (!file) return;
        try {
            setBusy(true);
            setPhase("upload");
            setPercent(0);
            setSubtext(`${file.name}`);

            appendLog(`Uploading ${file.name}…`);
            await uploadZip(file, (p) => setPercent(p));
            setPercent(100);
            appendLog(`Upload complete: ${file.name}`);

            await refresh();
            // if a new file arrived, prefer it
            if (zips.length) setSelected(zips[0]?.name ?? null);
        } catch (e: any) {
            appendLog(`ERROR during upload: ${String(e)}`);
        } finally {
            // keep the bar momentarily visible; you can remove this timeout if you prefer instant clear
            setTimeout(() => {
                setPhase(null);
                setPercent(null);
                setSubtext("");
                setBusy(false);
            }, 400);
        }
    }

    function handleProgress(p: StreamProgress) {
        if (p.phase === "unzip") {
            setPhase("unzip");
            setPercent(Math.max(0, Math.min(100, Math.round(p.percent))));
            setSubtext(""); // no extra info here
        }
        if (p.phase === "copy") {
            setPhase("copy");
            setPercent(Math.max(0, Math.min(100, Math.round(p.percent))));
            setSubtext(
                (p.copiedBytes != null && p.totalBytes != null && p.deltaBytes != null)
                    ? `${fmtMB(p.copiedBytes)}MB / ${fmtMB(p.totalBytes)}MB  (+${fmtMB(p.deltaBytes)}MB)`
                    : ""
            );
        }
    }

    function onRun() {
        if (!selected) return;
        setBusy(true);
        setLogs("");
        setPhase("unzip");
        setPercent(0);
        setSubtext("");

        processZipStream({
            filename: selected,
            password: password || undefined,
            onLog: appendLog,
            onProgress: handleProgress,
            onDone: () => {
                appendLog("DONE");
                setBusy(false);
                setPhase(null);
                setPercent(null);
                setSubtext("");
                onSuccess?.();
            },
            onError: (msg) => {
                appendLog(`ERROR: ${msg}`);
                setBusy(false);
                setPhase(null);
                setPercent(null);
                setSubtext("");
            },
        });
    }

    const phaseLabel =
        phase === "upload" ? "Uploading…" :
            phase === "unzip" ? "Unzipping…" :
                phase === "copy" ? "Copying media…" :
                    null;

    return (
        <Modal opened={opened} onClose={onClose} title="Sync Playnite backup" size="xl">
            <Stack gap="sm">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select
                        label="Select Backup" placeholder="Select a ZIP"
                        value={selected}
                        onChange={setSelected}
                        data={zips.map(z => ({ value: z.name, label: z.name }))}
                        w={280}
                    />
                    <FileButton onChange={onUpload} accept=".zip">
                        {(props) => <Button {...props} variant="light">Upload ZIP…</Button>}
                    </FileButton>
                    <TextInput
                        label="DB Password (optional)"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        w={280}
                    />
                    <Button onClick={onRun} loading={busy}>Run export</Button>
                </Group>

                {phaseLabel && percent !== null && (
                    <Stack gap={4}>
                        <Text size="sm">
                            {phaseLabel} {Math.round(percent)}% {subtext ? `(${subtext})` : ""}
                        </Text>
                        <Progress value={percent} />
                    </Stack>
                )}

                <Textarea
                    label="Logs"
                    value={logs}
                    maxRows={10}
                    autosize
                    styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }}
                />
            </Stack>
        </Modal>
    );
}
