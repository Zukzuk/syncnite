import * as React from "react";
import { createBrowserRouter, Navigate, Outlet, useNavigate } from "react-router-dom";
import AppShellLayout from "./layout/AppShellLayout";
import HomePage from "./layout/pages/HomePage";
import LibraryPage from "./layout/pages/LibraryPage";
import BridgePage from "./layout/pages/BridgePage";
import LoginPage from "./layout/pages/LoginPage";
import AdminPage from "./layout/pages/AdminPage";
import AccountPage from "./layout/pages/AccountPage";
import { useAuth } from "./hooks/useAuth";
import { useAdminGate } from "./hooks/useAdminGate";
import { INTERVAL_MS } from "./lib/constants";
import { clearCreds } from "./lib/utils";

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

function AdminOnly() {
  const { state } = useAuth({ pollMs: 0 });
  if (!state.ready) return null;
  return state.loggedIn && state.role === "admin" ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminGate() {
  const { hideSite, loaded, hasAdmin } = useAdminGate({ pollMs: INTERVAL_MS });
  if (!loaded) return null;
  if (!hasAdmin) {
    return (
      <AppShellLayout hideSite={hideSite}>
        <LoginPage />
      </AppShellLayout>
    );
  }
  return <Outlet />;
}

function LogoutAction() {
  const nav = useNavigate();
  React.useEffect(() => {
    clearCreds();
    nav("/login", { replace: true });
  }, [nav]);
  return null;
}

export const router = createBrowserRouter([
  {
    element: <AdminGate />,
    children: [
      {
        element: <WithShell hideSite />,
        children: [
          { path: "/login", element: <LoggedOutOnly />, children: [{ index: true, element: <LoginPage /> }] },
          { path: "/logout", element: <LogoutAction /> },
        ],
      },
      {
        element: <WithShell />,
        children: [
          {
            element: <LoggedInOnly />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/library", element: <LibraryPage /> },
              { path: "/bridge", element: <BridgePage /> },
              { path: "/account", element: <AccountPage /> },
            ],
          },
          {
            element: <AdminOnly />,
            children: [
              { path: "/admin", element: <AdminPage /> }
            ],
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
