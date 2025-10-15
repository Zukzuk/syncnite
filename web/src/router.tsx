import * as React from "react";
import { createBrowserRouter, Navigate, Outlet, useNavigate } from "react-router-dom";
import AppShellLayout from "./layout/AppShellLayout";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import BridgePage from "./pages/BridgePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import AccountPage from "./pages/AccountPage";
import { useAuth } from "./components/hooks/useAuth";
import { useAdminGate } from "./components/hooks/useAdminGate";
import { clearCreds } from "./lib/persist";

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
  return state.loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminGate() {
  const { hideSite, loaded, hasAdmin } = useAdminGate({ pollMs: 4000 });
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
              { path: "/settings", element: <SettingsPage /> },
              { path: "/account", element: <AccountPage /> },
            ],
          },
          {
            path: "/admin",
            element: <LoggedInOnly />,
            children: [{ element: <AdminOnly />, children: [{ index: true, element: <AdminPage /> }] }],
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
