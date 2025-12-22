import { useCallback, useEffect, useState } from "react";
import { AuthState } from "../types/app";
import { clearCreds, verifySession } from "../services/AccountService";

type UseParams = {
  pollMs: number;
};

type UseReturn = {
  state: AuthState;
  logout: () => void;
};

// A hook to manage and provide authentication state and actions.
export function useAuth({ pollMs }: UseParams): UseReturn {
  const [state, setState] = useState<AuthState>({
    ready: false,
    loggedIn: false,
    email: null,
    role: null,
  });

  const refresh = useCallback(async () => {
    const v = await verifySession();
    setState({
      ready: true,
      loggedIn: v.ok,
      email: v.email || null,
      role: v.role || null,
    });
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("sb:auth-changed", on);
    let timer: number | null = null;
    if (pollMs > 0) {
      timer = window.setInterval(() => { refresh().catch(() => { }); }, pollMs) as unknown as number;
    }
    return () => {
      window.removeEventListener("sb:auth-changed", on);
      if (timer) window.clearInterval(timer);
    };
  }, [refresh, pollMs]);

  const logout = useCallback(() => {
    clearCreds();
    setState({ ready: true, loggedIn: false, email: null, role: null });
  }, []);

  return { state, logout };
}
