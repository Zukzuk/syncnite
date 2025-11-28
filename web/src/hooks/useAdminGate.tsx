import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAdminStatus } from "../lib/api";

type UseParams = {
  pollMs: number;
};

type UseReturn = {
  hideSite: boolean;
  loaded: boolean;
  hasAdmin: boolean
};

// A hook to manage and provide admin gate status.
export function useAdminGate({ pollMs }: UseParams): UseReturn {
  const [hasAdmin, setHasAdmin] = React.useState<boolean>(true);
  const [loaded, setLoaded] = React.useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  React.useEffect(() => {
    let stop = false;
    async function tick() {
      const s = await fetchAdminStatus();
      if (stop) return;
      setHasAdmin(s.hasAdmin);
      setLoaded(true);

      // Only force the login/register surface when there's no admin
      if (!s.hasAdmin && loc.pathname !== "/login") {
        nav("/login", { replace: true });
      }

      if (!stop) setTimeout(tick, pollMs);
    }
    tick();
    return () => { stop = true; };
  }, [pollMs, loc.pathname, nav]);

  return { hideSite: loaded && !hasAdmin, loaded, hasAdmin };
}
