# Playnite Viewer (Web + API + Extension)

A small stack to **view** your Playnite library in the browser, and to **ingest** Playnite backup ZIPs into static JSON + media that the web UI can browse.

- **Web UI** (React + Mantine + Vite). Upload backups, watch a folder, import with progress, and browse your library.
- **API** (Node/Express) for uploads, streaming import, and the Playnite extension download.
- **Importer** (self-contained .NET 8 tool) that reads Playnite LiteDB files and dumps them to JSON (with optional password).

---

## Features

- **Upload** Playnite backup ZIPs (large files supported). Uploads show a live bar and survive navigation.
- **Watch a backup folder** via the browser’s directory picker (Chromium). Detects newer ZIPs and offers to upload & import.
- **Import with logs & progress**: server streams “unzip” and “copy” progress; UI shows phase + percent; logs persist across page changes.
- **Browse your library**: fast search, filters, tags, alphabetical rail, and quick actions.
- **Swagger** docs at `/api/docs`.
- **Playnite extension** download endpoint at `/api/extension/download`.

---

## Quick Start (Docker)

**Prereqs:** Docker + Docker Compose.

```bash
# From the repo root
docker compose up --build -d
# or
npm run up
```

- Web UI: http://localhost:3001  
- API:    http://localhost:3000

**Notes**

- Nginx is configured for large uploads and long-lived connections.
- `/data` is served as static content by Nginx; the frontend reads JSON from there.

---

## Development

### 1) Install & run dev servers

```bash
# install workspaces
npm i --workspaces --include-workspace-root

# API (http://localhost:3000)
npm run -w api dev

# Web (http://localhost:5173)
npm run -w web dev
```

Vite is configured to proxy `/api` → `http://localhost:3000` in development.

### 2) Importer binary for local API dev

When running the API outside Docker, the server expects a platform-appropriate **PlayniteImport** binary alongside `api` (invoked as `./PlayniteImport`). Build it with .NET 8, self-contained for your OS/arch, then copy the output next to the API (name it `PlayniteImport` or `PlayniteImport.exe`).

Example:

```bash
# from repo root
dotnet publish playnite/PlayniteImport/PlayniteImport.csproj \
  -c Release -r win-x64 --self-contained true \
  /p:PublishSingleFile=true /p:IncludeNativeLibrariesForSelfExtract=true

# copy the produced binary to ./api/PlayniteImport(.exe)
```

The API runs it as `./PlayniteImport <libDir> <dataDir>` and forwards `LITEDB_PASSWORD` if provided.

---

## How It Works

### Data flow

1. **Upload** → `POST /api/playnitedump/upload` (multer saves ZIP to `/input`).
2. **Import (SSE)** → `GET /api/playnitedump/process-stream?filename=...&password=...`  
   - Extracts the archive and streams progress & logs.  
   - Locates the library folder and runs `PlayniteImport` to dump LiteDB → JSON.  
   - Copies `libraryfiles` (icons/media) with byte-level progress.
3. **Web UI** reads processed JSON & media from `/data` and renders the library.

### Key endpoints

- `GET /api/playnitedump/zips` — list uploaded ZIPs  
- `POST /api/playnitedump/upload` — upload ZIP file  
- `GET /api/playnitedump/process-stream` — **SSE** progress/logs for import  
- `GET /api/extension/download` — download the Playnite extension  
- `GET /api/docs` — Swagger UI

---

## Using the Web UI

1. Open **Sync**:
   - **Select manually** to choose a ZIP, or
   - **Watch location** to pick a backup folder (Chromium browsers). When a newer ZIP appears, you’ll be prompted to upload & import.
2. Click **Run import** on the selected ZIP. You’ll see “Unzipping…” then “Copying media…”, with logs updating live.
3. Open **Library** to browse games (search, filter by source/tags, installed/hidden toggles, alphabetical rail).

> **Encrypted libraries**: provide the **DB Password** in the Import section — the server forwards it as `LITEDB_PASSWORD` to the importer.

---

## Playnite Extension (optional)

- Download from the API: `/api/extension/download` (the packaged `.pext` is served directly).
- The plugin registers a custom URI handler and can restart Playnite to run a restore with a given ZIP (`playnite://viewer/restore?...`).

---

## Project Layout

- `web/` — React app (Vite + Mantine). Production served by Nginx; dev proxy for `/api`.
- `api/` — Express server, SSE import pipeline, Swagger docs.
- `playnite/PlayniteImport` — .NET 8 console app (LiteDB → JSON).
- `playnite/PlayniteViewerBridge` — Playnite plugin.
- `docker-compose.yml` — two services (`api`, `web`) + volumes for `/input` and `/data`.
- Root scripts: `npm run up`, `npm run build`, `npm run clean`, etc.

---

## Troubleshooting

- **Uploads time out or fail**: if you’re behind another proxy, mirror Nginx’s large body size and long timeout settings.
- **No `/api` in dev**: ensure the API is on `:3000` and Vite dev server is running — the proxy is preconfigured.
- **Encrypted DBs**: wrong/empty password → importer may skip those DBs; supply the correct password in the UI.
- **Windows paths inside ZIPs**: handled during extraction (path normalization).

---

## License

TBD
