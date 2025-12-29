import { StrictMode, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { router } from "./router";
import { startGlobalSse } from "./services/SseClient";
import { AppError } from "./error/BoundaryAppError";
import { interlinkedTheme, themeResolver } from "./hooks/useInterLinkedTheme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import "./styles/body.scss";
import "./styles/fonts.scss";
import "./styles/scroller.scss";

function App() {
  useEffect(() => {
    const stopSse = startGlobalSse(); // connects to sse and streams logs+progress
    return () => stopSse?.(); // cleanup on hot-reload/unmount
  }, []);

  return (
    <AppError>
      <RouterProvider router={router} />
    </AppError>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      theme={interlinkedTheme}
      cssVariablesResolver={themeResolver}
      defaultColorScheme="dark"
    >
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  </StrictMode>
);
