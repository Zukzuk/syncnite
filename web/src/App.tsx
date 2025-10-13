import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AppErrorBoundary } from "./components/bounderies/AppErrorBoundary";

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
