import { useEffect, useState } from "react";
import { usePlexSnapshot } from "./usePlexSnapshot";
import { loadPlexOrigin } from "../services/PlexService";
import { InterLinkedData } from "../types/interlinked";

type UseParams = { pollMs: number };

type UseReturn = {
    libraryData: InterLinkedData | undefined;
};

export function usePlexData({ pollMs }: UseParams): UseReturn {
    const [libraryData, setData] = useState<InterLinkedData | undefined>(undefined);

    // external pollers
    const { version: libraryVersion } = usePlexSnapshot({ pollMs });

    // reload on manifest change
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const data = await loadPlexOrigin();
            if (!cancelled) {
                setData({ plex: data });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [libraryVersion]);

    return { libraryData };
}
