import { useCallback, useState } from "react";

type UseParams = {
  allowMultipleOpen?: boolean; // NEW FLAG
};

type UseReturn = {
  openIds: Set<string>;
  toggleOpen: (id: string, onOpen?: () => void) => void;
  replaceOpen: (nextId: string) => string | null;
};

// A hook to manage collapse open/close state with optional "only one open" mode
export function useGridOpenItemToggle(
  { allowMultipleOpen = true }: UseParams = {}
): UseReturn {

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggleOpen = useCallback((id: string, onOpen?: () => void) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      const willOpen = !next.has(id);

      if (willOpen) {
        if (!allowMultipleOpen) {
          // Close all others (this is what caused the silent-close problem on switch)
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

  const replaceOpen = useCallback((nextId: string) => {
    let prevId: string | null = null;

    setOpenIds(prev => {
      prevId = prev.size ? (prev.values().next().value as string) : null;

      if (allowMultipleOpen) {
        // In multi-open mode, "replace" doesn't really apply; just open additionally.
        const next = new Set(prev);
        next.add(nextId);
        return next;
      }

      // Single-open: exactly one open id
      return new Set([nextId]);
    });

    return prevId;
  }, [allowMultipleOpen]);

  return { openIds, toggleOpen, replaceOpen };
}
