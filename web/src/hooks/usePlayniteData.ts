import { useEffect, useState } from "react";
import { useLibraryRefresh } from "./useLibraryRefresh";
import { InterLinkedData } from "../types/interlinked";
import { useLocalInstalled } from "../features/library/hooks/useLocalInstalled";
import { loadPlayniteOrigin } from "../services/PlayniteService";

type UseParams = { pollMs: number };

type UseReturn = {
    libraryData: InterLinkedData | undefined;
    installedUpdatedAt: string | undefined;
};

// A hook to manage the library data with automatic refresh and installed status updates.
export function usePlayniteData({ pollMs }: UseParams): UseReturn {
    const [libraryData, setData] = useState<InterLinkedData | undefined>(undefined);

    // external pollers
    const { version: libraryVersion } = useLibraryRefresh({ pollMs });
    const { set: installedSet, updatedAt: installedUpdatedAt } = useLocalInstalled({ pollMs });

    // reload on manifest change
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const data = await loadPlayniteOrigin();
            if (!cancelled) {
                setData({ playnite: data });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [libraryVersion]);

    // fast "installed" patch when local installed changes
    useEffect(() => {
        if (!installedSet || !installedUpdatedAt) return;

        setData((prev) => {
            if (!prev?.playnite) return prev;

            return {
                ...prev,
                playnite: {
                    ...prev.playnite,
                    items: prev.playnite.items.map((item) => ({
                        ...item,
                        isInstalled: installedSet.has(item.id.toLowerCase()),
                    })),
                },
            };
        });
    }, [installedUpdatedAt, installedSet]);

    return { libraryData, installedUpdatedAt };
}

