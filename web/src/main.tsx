import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { loadLibrary } from "./lib/data";
import { LibraryView } from "./components/library/LibraryView";
import "@mantine/core/styles.css";
import "./index.css";

function AppShell() {
  const [state, setState] = React.useState<
    { ok: true; data: Awaited<ReturnType<typeof loadLibrary>> } |
    { ok: false; error: string } | null
  >(null);

  React.useEffect(() => {
    loadLibrary()
      .then(data => setState({ ok: true, data }))
      .catch(e => setState({ ok: false, error: String(e) }));
  }, []);

  if (!state) return <div className="view">Loading…</div>;
  if (!state.ok) return <div className="view">Failed to load library: {state.error}</div>;
  return <LibraryView data={state.data} />;
}

createRoot(document.getElementById("root")!).render(
  <>
    <ColorSchemeScript />
    <MantineProvider
      defaultColorScheme="auto"
      theme={{ primaryColor: "indigo", defaultRadius: "md", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <AppShell />
    </MantineProvider>
  </>
);
