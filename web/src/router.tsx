import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, useNavigate } from "react-router-dom";
import { INTERVAL_MS } from "./constants";
import { clearCreds } from "./services/AccountService";
import AppShellLayout from "./layout/AppShellLayout";
import HomePage from "./layout/HomePage";
import LibraryPage from "./layout/LibraryPage";
import BridgePage from "./layout/BridgePage";
import AppLoginPage from "./layout/AppLoginPage";
import AccountPage from "./layout/AccountPage";
import NarrowcastPage from "./layout/NarrowcastPage";
import { useAuth } from "./hooks/useAuth";
import { useAdminGate } from "./hooks/useAdminGate";
import RouteError from "./error/BounderyRouteError";

function WithShell({ hideSite = false }: { hideSite?: boolean }) {
  return (
    <AppShellLayout hideSite={hideSite}>
      <Outlet />
    </AppShellLayout>
  );
}

function LoggedOutOnly() {
  const { state } = useAuth({ pollMs: 0 });
  if (!state.ready) return null;
  return state.loggedIn ? <Navigate to="/" replace /> : <Outlet />;
}

function LoggedInOnly() {
  const { state } = useAuth({ pollMs: 0 });
  if (!state.ready) return null;
  return state.loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminGate() {
  const { hideSite, loaded, hasAdmin } = useAdminGate({ pollMs: INTERVAL_MS });
  if (!loaded) return null;
  if (!hasAdmin) {
    return (
      <AppShellLayout hideSite={hideSite}>
        <AppLoginPage />
      </AppShellLayout>
    );
  }
  return <Outlet />;
}

function LogoutAction() {
  const nav = useNavigate();
  useEffect(() => {
    clearCreds();
    nav("/login", { replace: true });
  }, [nav]);
  return null;
}

export const router = createBrowserRouter([
  {
    element: <AdminGate />,
    errorElement: <RouteError />,
    children: [
      // Narrowcast: no shell
      {
        element: <LoggedInOnly />,
        children: [{ path: "/narrowcast/:id?", element: <NarrowcastPage /> }],
      },

      // Auth pages: shell hidden (or no shell)
      {
        element: <WithShell hideSite />,
        children: [
          {
            path: "/login",
            element: <LoggedOutOnly />,
            children: [{ index: true, element: <AppLoginPage /> }],
          },
          { path: "/logout", element: <LogoutAction /> },
        ],
      },

      // Normal site: shell visible
      {
        element: <WithShell />,
        children: [
          {
            element: <LoggedInOnly />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/library/:id?", element: <LibraryPage /> },
              { path: "/bridge", element: <BridgePage /> },
              { path: "/account", element: <AccountPage /> },
            ],
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

