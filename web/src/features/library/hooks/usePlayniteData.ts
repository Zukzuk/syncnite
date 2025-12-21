import { useEffect, useState } from "react";
import { LoadedData } from "../../../types/types";
import { useLibraryRefresh } from "./useLibraryRefresh";
import { useLocalInstalled } from "./useLocalInstalled";
import { loadPlayniteLibrary } from "../../../services/PlayniteService";

type UseParams = { pollMs: number };

type UseReturn = {
    libraryData: LoadedData | null;
    installedUpdatedAt: string | null;
};

// A hook to manage the library data with automatic refresh and installed status updates.
export function usePlayniteData({ pollMs }: UseParams): UseReturn {
    const [libraryData, setData] = useState<LoadedData | null>(null);

    // external pollers
    const { version: libraryVersion } = useLibraryRefresh({ pollMs });
    const { set: installedSet, updatedAt: installedUpdatedAt } = useLocalInstalled({ pollMs });

    // reload on manifest change
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const fresh = await loadPlayniteLibrary();
            if (!cancelled) setData(fresh);
        })();
        return () => {
            cancelled = true;
        };
    }, [libraryVersion]);

    // fast "installed" patch when local installed changes
    useEffect(() => {
        if (!installedSet || !installedUpdatedAt) return;
        setData((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item) => ({
                ...item,
                isInstalled: installedSet.has(item.id.toLowerCase()),
            }));
            return { ...prev, items };
        });
    }, [installedUpdatedAt, installedSet]);

    return { libraryData, installedUpdatedAt };
}

