import { useCallback, useMemo } from "react";
import { AssociatedItems } from "../../../types/app";
import { useLibraryContext } from "../../../pages/LibraryContext";

type UseParams = {
    itemId: string;
    associatedData: AssociatedItems[];
};

type UseReturn = {
    openDeck: AssociatedItems | null;
    openDeckKey: string | null;
    setOpenDeckKey: (key: string) => void;
};

export function useOpenAssociatedDeck({ itemId, associatedData }: UseParams): UseReturn {
    const lib = useLibraryContext();

    const availableKeys = useMemo(
        () => associatedData.map((d) => d.key),
        [associatedData]
    );

    const openDeckKey = useMemo(
        () => lib.pickDeckKey(itemId, availableKeys),
        [lib.version, lib, itemId, availableKeys]
    );

    const openDeck = useMemo<AssociatedItems | null>(() => {
        if (associatedData.length === 0) return null;
        if (openDeckKey) return associatedData.find((d) => d.key === openDeckKey) ?? associatedData[0];
        return associatedData[0];
    }, [associatedData, openDeckKey]);

    const setOpenDeckKey = useCallback(
        (key: string) => lib.setSelectedDeckKey(itemId, key),
        [lib, itemId]
    );

    return { openDeck, openDeckKey: openDeck?.key ?? null, setOpenDeckKey };
}
