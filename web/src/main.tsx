import React from "react";
import { createRoot } from "react-dom/client";
import { loadLibrary } from "./lib/data";
import { Library } from "./components/Library";

function App() {
  const [state, setState] = React.useState<
    { ok: true; data: Awaited<ReturnType<typeof loadLibrary>> } |
    { ok: false; error: string } |
    null
  >(null);

  React.useEffect(() => {
    loadLibrary()
      .then(data => setState({ ok: true, data }))
      .catch(e => setState({ ok: false, error: String(e) }));
  }, []);

  if (!state) return <div className="view"><p>Loading…</p></div>;
  if (!state.ok) return <div className="view"><p>Failed to load library: {state.error}</p></div>;
  return <Library data={state.data} />;
}

createRoot(document.getElementById("root")!).render(<App />);
