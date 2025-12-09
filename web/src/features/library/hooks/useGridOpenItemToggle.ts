import * as React from "react";

type UseParams = {
  allowMultipleOpen?: boolean; // NEW FLAG
};

type UseReturn = {
  openIds: Set<string>;
  toggleOpen: (id: string, onOpen?: () => void) => void;
};

// A hook to manage collapse open/close state with optional "only one open" mode
export function useGridOpenItemToggle(
  { allowMultipleOpen = true }: UseParams = {}
): UseReturn {

  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());

  const toggleOpen = React.useCallback((id: string, onOpen?: () => void) => {

    setOpenIds(prev => {
      const next = new Set(prev);
      const willOpen = !next.has(id);

      if (willOpen) {
        if (!allowMultipleOpen) {
          // Close all others
          next.clear();
        }
        next.add(id);
        onOpen?.();
      } else {
        next.delete(id);
      }

      return next;
    });

  }, [allowMultipleOpen]);

  return { openIds, toggleOpen };
}
