import * as React from "react";
import { getCreds, setCreds, clearCreds, verify } from "../../lib/persist";
import { AuthState } from "../../lib/types";

export function useAuth(pollMs = 0): {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
} {
  const [state, setState] = React.useState<AuthState>({
    ready: false,
    loggedIn: false,
    email: null,
  });

  const refresh = React.useCallback(async () => {
    const c = getCreds();
    const ok = await verify();
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
    setCreds(email, password); // persist then verify
    await refresh();
    return true;
  }, [refresh]);

  const logout = React.useCallback(() => {
    clearCreds();
    setState({ ready: true, loggedIn: false, email: null });
  }, []);

  return { state, login, logout };
}
