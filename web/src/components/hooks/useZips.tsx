import React from "react";
import { listZips, ZipInfo } from "../../lib/api";

export function useZips() {
    const [zips, setZips] = React.useState<ZipInfo[]>([]);
    const [selected, setSelected] = React.useState<string | null>(null);

    const refresh = React.useCallback(async () => {
        const zs = await listZips();
        setZips(zs);
        setSelected(prev => (prev ?? (zs[0]?.name ?? null)));
    }, []);

    React.useEffect(() => { void refresh(); }, [refresh]);

    return { zips, selected, setSelected, refresh };
}
