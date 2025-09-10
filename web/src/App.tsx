import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppShellLayout from "./layout/AppShellLayout";
import LibraryPage from "./pages/LibraryPage";
import SyncPage from "./pages/SyncPage";

function HomePage() {
  return <div style={{ padding: 8 }}><h2>Welcome</h2><p>Use the sidebar to open Library or Sync.</p></div>;
}
function SettingsPage() {
  return <div style={{ padding: 8 }}><h2>Settings</h2><p>Coming soon.</p></div>;
}

const router = createBrowserRouter([
  { path: "/", element: <AppShellLayout><HomePage /></AppShellLayout> },
  { path: "/library", element: <AppShellLayout><LibraryPage /></AppShellLayout> },
  { path: "/sync", element: <AppShellLayout><SyncPage /></AppShellLayout> },
  { path: "/settings", element: <AppShellLayout><SettingsPage /></AppShellLayout> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
