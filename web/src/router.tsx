import { createBrowserRouter } from "react-router-dom";
import AppShellLayout from "./layout/AppShellLayout";
import LibraryPage from "./pages/LibraryPage";
import BackupPage from "./pages/BackupPage";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";

export const router = createBrowserRouter([
  { path: "/", element: <AppShellLayout><HomePage /></AppShellLayout> },
  { path: "/library", element: <AppShellLayout><LibraryPage /></AppShellLayout> },
  { path: "/bridge", element: <AppShellLayout><BackupPage /></AppShellLayout> },
  { path: "/settings", element: <AppShellLayout><SettingsPage /></AppShellLayout> },
]);