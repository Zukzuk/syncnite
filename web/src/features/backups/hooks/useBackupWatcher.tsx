import React from "react";
import { BackupWatcher, BackupWatchState } from "../BackupWatcher";

export function useBackupWatcher() {
    const [state, setState] = React.useState<BackupWatchState | null>(null);

    React.useEffect(() => {
        const unsub = BackupWatcher.subscribe(setState);
        return () => { unsub(); };
    }, []);

    const pickDirectory = React.useCallback(() => BackupWatcher.selectDirectory(), []);

    return { state, pickDirectory };
}
