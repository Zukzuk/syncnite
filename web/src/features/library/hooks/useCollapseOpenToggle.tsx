import * as React from "react";

type UseReturn = {
  openIds: Set<string>;
  everOpenedIds: Set<string>;
  toggleOpen: (id: string, onOpen?: () => void) => void;
};

export function useCollapseOpenToggle(): UseReturn {
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());
  const [everOpenedIds, setEverOpenedIds] = React.useState<Set<string>>(new Set());

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

    setEverOpenedIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    
  }, []);

  return { openIds, everOpenedIds, toggleOpen };
}
