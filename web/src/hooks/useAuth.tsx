import * as React from "react";
import { getCreds, setCreds, clearCreds } from "../lib/persist";
import { verifyAdmin } from "../lib/api";

type AuthState = {
  ready: boolean;
  loggedIn: boolean;
  email: string | null;
};

type UseParams = { 
  pollMs: number; 
};

type UseReturn = {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export function useAuth({ pollMs }: UseParams): UseReturn {
  const [state, setState] = React.useState<AuthState>({
    ready: false,
    loggedIn: false,
    email: null,
  });

  const refresh = React.useCallback(async () => {
    const c = getCreds();
    const ok = await verifyAdmin();
    setState({
      ready: true,
      loggedIn: ok,
      email: ok && c ? c.email : null,
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

  const login = React.useCallback(async (email: string, password: string) => {
    setCreds(email, password);
    await refresh();
    return true;
  }, [refresh]);

  const logout = React.useCallback(() => {
    clearCreds();
    setState({ ready: true, loggedIn: false, email: null });
  }, []);

  return { state, login, logout };
}
