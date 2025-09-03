import React, { useMemo, useState } from "react";
import type { SortKey, SortDir } from "../lib/types";
import type { Loaded } from "../lib/data";

export function Library({ data }: { data: Loaded }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const qv = (q || "").toLowerCase().trim();
    const pass = data.rows.filter(r =>
      (!source || r.source === source) &&
      (!tag || r.tags.includes(tag)) &&
      (!qv ||
        r.title.toLowerCase().includes(qv) ||
        r.source.toLowerCase().includes(qv) ||
        r.tags.some(t => t.toLowerCase().includes(qv)))
    );

    const sortVal = (r: typeof data.rows[number]) => {
      switch (sortKey) {
        case "title": return (r.sortingName || r.title).toLowerCase();
        case "source": return (r.source || "").toLowerCase();
        case "tags": return r.tags.join(", ").toLowerCase();
      }
    };
    pass.sort((a, b) => {
      const av = sortVal(a), bv = sortVal(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return pass;
  }, [q, source, tag, sortKey, sortDir, data.rows]);

  function headerLabel(base: string, key: SortKey) {
    if (sortKey !== key) return base;
    return `${base} ${sortDir === "asc" ? "▲" : "▼"}`;
  }
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <section className="view">
      <header className="controls">
        <h1 style={{margin:0}}>Library</h1>
        <input
          placeholder="Search titles / tags / source…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select value={source} onChange={e => setSource(e.target.value)}>
          <option value="">All sources</option>
          {data.allSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">All tags</option>
          {data.allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="muted">{filtered.length} / {data.rows.length}</span>
      </header>

      <table id="grid">
        <thead>
          <tr>
            <th style={{width:44}}>Icon</th>
            <th className="sortable" onClick={() => toggleSort("title")}>
              {headerLabel("Title","title")}
            </th>
            <th className="sortable" onClick={() => toggleSort("source")}>
              {headerLabel("Source","source")}
            </th>
            <th className="sortable" onClick={() => toggleSort("tags")}>
              {headerLabel("Tags","tags")}
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className={r.hidden ? "hidden-row" : ""}>
              <td>
                <img
                  className="icon"
                  src={r.iconUrl}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = "/data/libraryfiles/does-not-exist.png"; // triggers background + keeps layout
                  }}
                />
              </td>
              <td>
                {r.url
                  ? <a href={r.url} target="_blank" rel="noopener">{r.title}</a>
                  : r.title}
              </td>
              <td>{r.source}</td>
              <td>
                {r.tags.map(t => <span key={t} className="pill">{t}</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
