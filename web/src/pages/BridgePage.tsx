import React from "react";
import { Stack, Group, Select, Button, FileButton, PasswordInput, Textarea, Text } from "@mantine/core";
import { SectionCard } from "../components/SectionCard";
import { LoadingBar } from "../components/LoadingBar";
import { useZips } from "../hooks/useZips";
import { useUpload } from "../hooks/useUpload";
import { useBackupWatcher } from "../hooks/useBackupWatcher";
import { useImporter } from "../hooks/useImporter";
import { Phase } from "../lib/types";

function useExportPhaseLabel(phase: Phase) {
    if (phase === "unzip") return "Unzipping…";
    if (phase === "copy") return "Copying media…";
    return "";
}

export default function BridgePage() {
    const { zips, selected, setSelected, refresh } = useZips();


    const upload = useUpload({
        onZipsChanged: async (name) => {
            await refresh();
            if (name) setSelected(name);
        },
    });

    const watcher = useBackupWatcher();
    const importer = useImporter();
    const exportPhaseLabel = useExportPhaseLabel(importer.phase);

    return (
        <Stack gap="lg" p="md">
            <Text fz={24} fw={700}>Shared</Text>

            <SectionCard title="Shared library location">
                <Group gap="sm" wrap="wrap" align="center">
                    <FileButton onChange={upload.onUpload} accept=".zip">
                        {(props) => <Button {...props} variant="light" loading={upload.busy}>Select manually</Button>}
                    </FileButton>

                    <Button
                        variant="subtle"
                        onClick={watcher.pickDirectory}
                        disabled={!watcher.state?.supported}
                        title={watcher.state?.supported ? "Pick your Playnite backup folder to monitor" : "Browser not supported"}
                    >
                        Watch location
                    </Button>

                    <Text size="sm" className="is-dim" style={{ whiteSpace: "nowrap", alignSelf: "center" }}>
                        {watcher.state?.dirName ? `/${watcher.state.dirName}` : "Not watching a folder"}
                    </Text>
                </Group>

                <LoadingBar label="Uploading…" percent={upload.percent} subtext={upload.subtext} />
            </SectionCard>

            <SectionCard title="Import">
                <Group align="end" gap="sm" wrap="wrap">
                    <Select
                        label="Select"
                        placeholder="Select Available Backup"
                        allowDeselect={false}
                        searchable={false}
                        value={selected}
                        onChange={setSelected}
                        data={zips.map(z => ({ value: z.name, label: z.name }))}
                        w={360}
                    />
                    <PasswordInput
                        label="DB Password (optional)"
                        placeholder="Password"
                        onChange={(e) => {/* lift to local state if you want; or put into useImporter if needed */ }}
                        w={200}
                    />
                    <Button
                        onClick={() => selected && importer.startImport({ filename: selected /*, password*/ })}
                        loading={importer.busy}
                        disabled={!selected}
                        variant="light"
                    >
                        Run import
                    </Button>
                </Group>
                <LoadingBar label={exportPhaseLabel} percent={importer.percent} subtext={importer.subtext} />
            </SectionCard>

            <SectionCard title="Logs">
                <Textarea value={importer.logs} maxRows={10} autosize styles={{ input: { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } }} />
                <Text size="xs" className="is-dim">Newest on top</Text>
            </SectionCard>
        </Stack>
    );
}
