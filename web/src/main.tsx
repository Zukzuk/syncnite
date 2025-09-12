import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProviders } from "./theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </React.StrictMode>
);
