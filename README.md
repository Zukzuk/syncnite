# Playnite Viewer

A self‑hosted web viewer and API for browsing and restoring **Playnite** libraries from backups.

It consists of:
- **Web frontend** (`web/`) – React + Vite + Mantine UI to browse your library.
- **API backend** (`api/`) – Express.js service that handles uploads, extraction, LiteDB → JSON conversion, and serves the Playnite extension. OpenAPI docs included.
- **Extensions** (`extensions/`)
  - `PlayniteDump` — .NET 8 console tool that dumps Playnite LiteDB files to JSON.
  - `PlayniteViewerBridge` — Playnite plugin (.pext) that enables URI‑based backup restoration: `playnite://viewer/restore?...`

Runs via **Docker Compose** for a one‑command setup.

---

## Features

- Upload a Playnite backup `.zip` from the web UI.
- Validates and extracts with 7‑Zip, normalizes paths, and auto‑detects the library folder.
- Dumps all LiteDB `.db` files to pretty‑printed JSON (handles encrypted DBs when `LITEDB_PASSWORD` is provided).
- Copies `libraryfiles` (icons/media) with live progress.
- Browse, search, sort and filter (source, tags, installed, hidden) with a fast virtual list.
- Serve the Playnite extension (`.pext`) for installation directly in Playnite.
- REST API with **Swagger/OpenAPI** docs at `/api/docs` and raw spec at `/api/docs.json`.

---

## Quick start (Docker)

> Prereqs: Docker & Docker Compose

```bash
# Build and start API + Web
npm run up
```

Services:
- **Web UI** → http://localhost:3001  
- **API** → http://localhost:3000  
- **API docs** → http://localhost:3000/api/docs

Mounted folders:
- `./backups` → container `/input` (drop your Playnite backup ZIPs here or use the UI uploader)
- `./data` → container `/data` (generated JSON & copied media). Also mounted read‑only into the web container for static serving at `/data`.

The API uses a tmpfs mount for `/work` (scratch space for extraction).

---

## Using the Web UI

1. Open **http://localhost:3001**.
2. Click **Menu → Sync backup…**.
3. Pick an existing ZIP from the dropdown *or* click **Upload ZIP…** to add one.
4. (Optional) Provide a **DB Password** if your LiteDB is encrypted.
5. Click **Run export**.  
   You’ll see **Unzipping** and **Copying media** progress. Logs stream live.

When complete, the UI reloads the data from `./data/` and you can browse:
- Search across titles/sources/tags/year
- Filter by **Source**, **Tags**, **Installed**, **Hidden**
- Sort by **Title**, **Year**, **Source**, **Tags**
- Click a game title to open a best‑effort store/community page

---

## Installing / using the Playnite extension

The API serves a packaged `.pext`:

```
http://localhost:3000/api/extension/download
```

Install it in Playnite to enable a URI handler: `playnite://viewer/restore?...`

Supported query params (handled by the plugin):
- `file` — local path to a backup zip, e.g. `?file=C:\Backups\my.zip`
- `url` — HTTP(S) link to a backup zip (plugin downloads to a temp file), e.g. `?url=https://example.com/my.zip`
- `items` — optional restore items list like `0,1,2,3,4,5` (defaults to all).

Examples:
```
playnite://viewer/restore?file=C:\Backups\my.zip
playnite://viewer/restore?url=https://example.com/my.zip&items=0,1,2
```

The plugin prepares a temporary config for Playnite’s `--restorebackup` mechanism and restarts Playnite to perform the restore.

> The download endpoint currently serves: `extensions/PlayniteViewerBridge/playnite-viewer-bridge-1.0.0.pext`

---

## REST API

OpenAPI UI: **`/api/docs`** — Raw JSON: **`/api/docs.json`**

Key endpoints (see JSDoc annotations in `api/src/routes/*.ts`):

- `GET /api/playnitedump/zips`  
  List uploaded ZIP files found under `/input` (mapped from `./backups`).

- `POST /api/playnitedump/upload` (multipart, field: `file`)  
  Upload a ZIP into `/input` (name sanitized).

- `GET /api/playnitedump/process-stream?filename=<name>&password=<optional>`  
  **Server‑Sent Events (SSE)** stream of the processing pipeline:  
  - `log` — textual updates  
  - `progress` — `{ phase: "unzip" | "copy", percent, ... }`  
  - `done` or `error`

- `GET /api/extension/download`  
  Download the packaged `.pext`.

---

## Local development

> Prereqs: Node.js 20+, PNPM/NPM; .NET 8 SDK if you need to build `PlayniteDump` locally

Install deps (root + workspaces):

```bash
npm run install:all
```

Build everything (web, api, concat snapshot, pack extension):

```bash
npm run build
```

Useful scripts:
```bash
npm run -w web dev     # Frontend dev server (Vite)
npm run -w api dev     # API with ts-node-dev
npm run clean          # Remove build artifacts & concatenated code file
npm run concat         # Rebuild /concat-code.txt (repo snapshot helper)
npm run build:ext      # Builds/repacks the .pext (see scripts/)
```

## Notes & tips

- The API relies on **7‑Zip** (`p7zip`) inside the container.
- Media copy looks for a sibling `libraryfiles` directory next to the detected library folder (or top‑level folders). Progress includes `copiedBytes`, `totalBytes`, and `deltaBytes` between updates.
- If your library databases are encrypted, set `LITEDB_PASSWORD` in the **process‑stream** query (the router forwards env to the dumper). From the UI, fill the **DB Password** field.
- Frontend cache‑busts JSON fetches with `?v=<timestamp>` to always see fresh dumps.
- Web container exposes `/data/` with `autoindex on` for quick inspection.

---

## License

MIT (or choose a license and update this section).
