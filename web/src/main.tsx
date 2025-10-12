import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BackupWatcher } from "./services/BackupWatcher";
import { AppProviders } from "./theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./main.scss";

declare global { interface Window { __APP_VERSION__?: string } }

export const WEB_APP_VERSION = window.__APP_VERSION__ ?? 'dev';

BackupWatcher.tryRestorePrevious().catch(() => { });

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </React.StrictMode>
);
