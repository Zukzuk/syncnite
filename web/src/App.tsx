import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AppErrorBoundary } from "./components/bounderies/AppErrorBoundary";
import { startGlobalSse } from "./services/SseClient";

export default function App() {
  useEffect(() => {
    const stopSse = startGlobalSse(); // connects to /api/sse and streams logs+progress
    return () => stopSse?.();         // cleanup on hot-reload/unmount
  }, []);

  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
