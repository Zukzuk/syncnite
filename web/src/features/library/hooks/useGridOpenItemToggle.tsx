import * as React from "react";

type UseReturn = {
  openIds: Set<string>;
  toggleOpen: (id: string, onOpen?: () => void) => void;
};

// A hook to manage collapse open/close state with tracking of ever opened items.
export function useGridOpenItemToggle(): UseReturn {
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());
  const toggleOpen = React.useCallback((id: string, onOpen?: () => void) => {

    setOpenIds(prev => {
      const next = new Set(prev);
      const willOpen = !next.has(id);
      if (willOpen) {
        next.add(id);
        onOpen?.();
      } else {
        next.delete(id);
      }
      return next;
    });

  }, []);

  return { openIds, toggleOpen };
}
