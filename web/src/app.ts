// --- Helpers to normalize GUIDs from Playnite/LiteDB ------------------------
type Guidish =
  | string
  | { $guid?: string }
  | { $oid?: string }
  | { Guid?: string }
  | { Value?: string }
  | null
  | undefined;

const asGuid = (v: Guidish): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const obj = v as Record<string, unknown>;
  for (const key of ["$guid", "$oid", "Guid", "Value"]) {
    const val = obj[key];
    if (typeof val === "string" && val.length) return val;
  }
  return null;
};
const asGuidArray = (arr: Guidish[] | undefined): string[] =>
  Array.isArray(arr) ? (arr.map(asGuid).filter(Boolean) as string[]) : [];

// --- Minimal shapes from dumps ---------------------------------------------
type Link = { Name?: string; Url?: string };
type GameDoc = {
  _id?: Guidish;
  Id?: Guidish;
  Name?: string;
  TagIds?: Guidish[];
  SourceId?: Guidish;
  Hidden?: boolean;
  GameId?: string | number;   // store-specific id (stringy for many stores)
  Links?: Link[];             // often has “Store”/“Steam” etc.
  Icon?: string;              // relative path (backslashes on Windows)
  IconId?: Guidish;           // some installs use GUID-named files
};
type NamedDoc = { _id?: Guidish; Id?: Guidish; Name?: string };

// --- Source URL templates (fallback if no Link present) ---------------------
const sourceUrlTemplates: Record<string, (g: GameDoc) => string | null> = {
  steam: (g) => {
    const id = String((g as any).GameId ?? "").trim();
    return /^\d+$/.test(id) ? `https://store.steampowered.com/app/${id}` : null;
  },
  epic: (g) => {
    const id = String((g as any).GameId ?? "").trim(); // usually a slug
    return id ? `https://store.epicgames.com/p/${encodeURIComponent(id)}` : null;
  },
  gog: (g) => {
    const id = String((g as any).GameId ?? "").trim(); // slug-ish
    return id ? `https://www.gog.com/game/${encodeURIComponent(id)}` : null;
  },
  "ubisoft connect": () => null,
  "ea app": () => null,
  "battle.net": () => null,
  xbox: () => null,
  humble: () => null,
  nintendo: () => null,
  "microsoft store": () => null,
};

// --- fetch utils ------------------------------------------------------------
async function getJson<T = any>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}
async function tryLoadMany<T = any>(candidates: string[], fallback: T): Promise<T> {
  for (const c of candidates) {
    try { return await getJson<T>(c); } catch { }
  }
  return fallback;
}
function escapeHtml(s: string) {
  const div = document.createElement("div");
  div.innerText = s ?? "";
  return div.innerHTML;
}

// --- icon helpers -----------------------------------------------------------
const FALLBACK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
      <rect width='100%' height='100%' fill='#ddd'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='sans-serif' font-size='10' fill='#777'>no icon</text>
    </svg>`
  );

function normalizePath(p?: string): string | null {
  if (!p) return null;
  // drop any leading .\ or ./
  let s = p.replace(/\\/g, "/").replace(/^\.?\//, "");
  // Playnite paths sometimes include "libraryfiles/" already; that's fine
  return s;
}

function buildIconUrl(iconRel: string | null, iconId: string | null): string {
  if (iconRel && /^https?:\/\//i.test(iconRel)) return iconRel;

  if (iconRel) {
    const rel = iconRel.replace(/\\/g, "/").replace(/^\.?\//, "");
    // serve from /data/libraryfiles
    const path = rel.startsWith("libraryfiles/") ? rel : `libraryfiles/${rel}`;
    return `/data/${path}`;
  }
  if (iconId) {
    return `/data/libraryfiles/${iconId}.png`;
  }
  return FALLBACK_ICON;
}

// --- Data loading & shaping --------------------------------------------------
type Row = {
  id: string;
  title: string;        // display name
  sortingName: string;  // hidden sort key
  source: string;
  tags: string[];
  hidden: boolean;
  url: string | null;
  iconUrl: string;
  raw: GameDoc;
};

function firstStoreishLink(links: Link[] | undefined, sourceName: string): string | null {
  if (!links?.length) return null;
  const lowerSrc = sourceName.toLowerCase();
  const prefer = links.find(l => {
    const n = (l.Name ?? "").toLowerCase();
    return n === "store" || n === lowerSrc || n.includes("store");
  });
  if (prefer?.Url) return prefer.Url;

  const byDomain = links.find(l => {
    const u = (l.Url ?? "").toLowerCase();
    return (
      (lowerSrc.includes("steam") && u.includes("steampowered.com")) ||
      (lowerSrc.includes("epic") && u.includes("epicgames.com")) ||
      (lowerSrc.includes("gog") && u.includes("gog.com")) ||
      (lowerSrc.includes("ubisoft") && (u.includes("ubisoft.com") || u.includes("uplay"))) ||
      (lowerSrc.includes("ea") && (u.includes("ea.com") || u.includes("origin.com"))) ||
      (lowerSrc.includes("battle.net") && (u.includes("battle.net") || u.includes("blizzard.com"))) ||
      (lowerSrc.includes("xbox") && (u.includes("xbox.com") || u.includes("microsoft.com"))) ||
      (lowerSrc.includes("humble") && u.includes("humblebundle.com")) ||
      (lowerSrc.includes("nintendo") && u.includes("nintendo.com"))
    );
  });
  return byDomain?.Url ?? null;
}

async function loadLibrary(base = "/data") {
  const games = await tryLoadMany<GameDoc[]>(
    [`${base}/library.games.Game.json`],
    [],
  );
  const tags = await tryLoadMany<NamedDoc[]>(
    [`${base}/library.tags.Tag.json`],
    [],
  );
  const sources = await tryLoadMany<NamedDoc[]>(
    [
      `${base}/library.sources.GameSource.json`,
      `${base}/library.sources.Source.json`,
    ],
    [],
  );

  const normNamed = (x: NamedDoc) => ({
    id: asGuid(x.Id) ?? asGuid(x._id),
    name: x.Name ?? "",
  });
  const tagById = new Map(
    tags.map(normNamed).filter(t => t.id).map(t => [t.id as string, t.name]),
  );
  const sourceById = new Map(
    sources.map(normNamed).filter(s => s.id).map(s => [s.id as string, s.name]),
  );

  const rows: Row[] = games.map(g => {
    const id = asGuid(g.Id) ?? asGuid(g._id) ?? "";
    const tagIds = asGuidArray(g.TagIds);
    const sourceId = asGuid(g.SourceId);
    const sourceName = sourceId ? (sourceById.get(sourceId) ?? "") : "";

    // link
    let url = firstStoreishLink(g.Links, sourceName);
    if (!url && sourceName) {
      const tmpl = sourceUrlTemplates[sourceName.toLowerCase()];
      if (tmpl) url = tmpl(g);
    }

    // icon
    const iconRel = normalizePath((g as any).Icon);
    const iconId = asGuid((g as any).IconId);
    const iconUrl = buildIconUrl(iconRel, iconId);

    return {
      id,
      title: g.Name ?? "(Untitled)",
      sortingName: (g as any).SortingName ?? g.Name ?? "",
      source: sourceName,
      tags: tagIds.map(tid => tagById.get(tid)).filter(Boolean) as string[],
      hidden: !!g.Hidden,
      url: url ?? null,
      iconUrl,
      raw: g,
    };
  });

  const allSources = Array.from(new Set(rows.map(r => r.source).filter(Boolean))).sort();
  const allTags = Array.from(new Set(rows.flatMap(r => r.tags).filter(Boolean))).sort();

  return { rows, allSources, allTags };
}

// --- UI with click-to-sort ---------------------------------------------------
type SortKey = "title" | "source" | "tags";
type SortDir = "asc" | "desc";

function setupUI({ rows, allSources, allTags }: Awaited<ReturnType<typeof loadLibrary>>) {
  const q = document.getElementById("q") as HTMLInputElement;
  const sourceSel = document.getElementById("source") as HTMLSelectElement;
  const tagSel = document.getElementById("tag") as HTMLSelectElement;
  const tbody = document.querySelector<HTMLTableSectionElement>("#grid tbody")!;
  const count = document.getElementById("count")!;

  // populate filters
  for (const s of allSources) {
    const o = document.createElement("option");
    o.value = o.textContent = s;
    sourceSel.appendChild(o);
  }
  for (const t of allTags) {
    const o = document.createElement("option");
    o.value = o.textContent = t;
    tagSel.appendChild(o);
  }

  // sorting state
  let sortKey: SortKey = "title";
  let sortDir: SortDir = "asc";

  // headers: 1 Icon, 2 Title, 3 Source, 4 Tags
  const thTitle = document.querySelector<HTMLTableCellElement>("#grid thead th:nth-child(2)")!;
  const thSource = document.querySelector<HTMLTableCellElement>("#grid thead th:nth-child(3)")!;
  const thTags = document.querySelector<HTMLTableCellElement>("#grid thead th:nth-child(4)")!;

  const setSort = (key: SortKey) => {
    if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
    else { sortKey = key; sortDir = "asc"; }
    render();
  };

  thTitle.style.cursor = thSource.style.cursor = thTags.style.cursor = "pointer";
  thTitle.addEventListener("click", () => setSort("title"));
  thSource.addEventListener("click", () => setSort("source"));
  thTags.addEventListener("click", () => setSort("tags"));

  function headerLabel(base: string, key: SortKey) {
    if (sortKey !== key) return base;
    return `${base} ${sortDir === "asc" ? "▲" : "▼"}`;
  }
  function sortVal(r: Row): string {
    switch (sortKey) {
      case "title": return (r.sortingName || r.title).toLowerCase();
      case "source": return (r.source || "").toLowerCase();
      case "tags": return r.tags.join(", ").toLowerCase();
    }
  }

  function render() {
    thTitle.textContent = headerLabel("Title", "title");
    thSource.textContent = headerLabel("Source", "source");
    thTags.textContent = headerLabel("Tags", "tags");

    const qv = (q.value || "").toLowerCase().trim();
    const srcv = sourceSel.value;
    const tagv = tagSel.value;

    const filtered = rows.filter(r =>
      (!srcv || r.source === srcv) &&
      (!tagv || r.tags.includes(tagv)) &&
      (!qv ||
        r.title.toLowerCase().includes(qv) ||
        r.source.toLowerCase().includes(qv) ||
        r.tags.some(t => t.toLowerCase().includes(qv))),
    );

    filtered.sort((a, b) => {
      const av = sortVal(a), bv = sortVal(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    tbody.innerHTML = "";
    for (const r of filtered) {
      const titleHtml = r.url
        ? `<a href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>`
        : escapeHtml(r.title);

      const tr = document.createElement("tr");
      if (r.hidden) tr.classList.add("hidden-row");
      tr.innerHTML = `
        <td style="width:44px">
          <img src="${r.iconUrl}"
               alt=""
               style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f3f3f3"
               onerror="this.onerror=null;this.src='${FALLBACK_ICON}'" />
        </td>
        <td>${titleHtml}</td>
        <td>${escapeHtml(r.source)}</td>
        <td>${r.tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join(" ")}</td>
      `;
      tbody.appendChild(tr);
    }
    count.textContent = `${filtered.length} / ${rows.length}`;
  }

  q.addEventListener("input", render);
  sourceSel.addEventListener("change", render);
  tagSel.addEventListener("change", render);
  render();
}

// --- boot -------------------------------------------------------------------
loadLibrary()
  .then(setupUI)
  .catch(err => {
    const tbody = document.querySelector("#grid tbody")!;
    tbody.innerHTML = `<tr><td colspan="4">Failed to load library: ${escapeHtml(String(err))}</td></tr>`;
    console.error(err);
  });
