import * as React from "react";
import { clearCreds } from "../lib/persist";
import { verifySession } from "../lib/api";

type AuthState = {
  ready: boolean;
  loggedIn: boolean;
  email: string | null;
  role: string | null;
};

type UseParams = {
  pollMs: number;
};

type UseReturn = {
  state: AuthState;
  logout: () => void;
};

export function useAuth({ pollMs }: UseParams): UseReturn {
  const [state, setState] = React.useState<AuthState>({
    ready: false,
    loggedIn: false,
    email: null,
    role: null,
  });

  const refresh = React.useCallback(async () => {
    const v = await verifySession();
    setState({
      ready: true,
      loggedIn: v.ok,
      email: v.email || null,
      role: v.role || null,
    });
  }, []);

  React.useEffect(() => {
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

  const logout = React.useCallback(() => {
    clearCreds();
    setState({ ready: true, loggedIn: false, email: null, role: null });
  }, []);

  return { state, logout };
}
