import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { router } from "./router";
import { AppErrorBoundary } from "./bounderies/AppErrorBoundary";
import { startGlobalSse } from "./services/SseClient";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

declare global { interface Window { __APP_VERSION__?: string } }

const appTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: "grape",
    fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    headings: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    },
});

function App() {
  useEffect(() => {
    const stopSse = startGlobalSse(); // connects to sse and streams logs+progress
    return () => stopSse?.(); // cleanup on hot-reload/unmount
  }, []);

  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <MantineProvider theme={appTheme} defaultColorScheme="auto">
            <Notifications position="bottom-right" />
            <App />
        </MantineProvider>
    </React.StrictMode>
);
