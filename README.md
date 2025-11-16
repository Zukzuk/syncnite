# Syncnite
## A self-hosted Playnite LibrarySynchronizer and WebViewer

Syncnite makes it possible to **share your Playnite library** — games, metadata, media, settings — with family members or across your own devices.  
It provides a self‑hosted API, a web viewer, and a companion Playnite extension (**Syncnite Bridge**) that performs fast, incremental syncing based on the new *PullDelta* mechanism.

## ⭐ What Syncnite does

### ✔️ Serve your Playnite library on the web
- Clean JSON-based viewer
- Searchable and fast
- Works fully offline once loaded

### ✔️ Incremental sync via PullDelta
- The Syncnite Bridge asks the server which items changed (using versions + checksums)
- Only changed entities and media are uploaded
- Reduces unnecessary bandwidth and makes frequent syncs instant

### ✔️ Push from Playnite via Syncnite Bridge
- Uploads library ZIPs when needed
- Pushes installed games list
- Binary media uploads
- Delta-based sync instead of full transfers

### ✔️ Self‑host easily
- Docker Compose stack (`api`, `web`, `.pext` builder)
- Runs on any server, NAS, or even a local machine

## ⚙️ Developer workflows

Orchestration scripts in the repo root manage all workspaces (`api`, `web`, extension builder).

### Run full stack
```bash
npm i
npm run up
```

### Build everything
```bash
npm run build
```
Builds:
- API  
- Web UI  
- `.pext` extension  

### Use conventional commits
```bash
npm run commit
```

### Push branch and tags
```bash
npm run push
```

### Release Docker images
```bash
npm run release
```

### Clean generated artifacts
```bash
npm run clean
```

## 🧩 Components

| Component | Description |
|-----------|-------------|
| **syncnite-api** | Node.js/Express backend. Handles accounts, deltas, media, snapshots. |
| **syncnite-web** | Web UI for browsing the library and downloading `.pext`. |
| **PlayniteImport** | .NET 8 binary that converts Playnite LiteDB → structured JSON. |
| **SyncniteBridge** | Playnite extension handling login, PullDelta, uploads, media sync. |

## 🚀 SyncniteBridge (A Playnite Extension)

### What it does
- Performs PullDelta requests to sync only changed data
- Uploads changed JSON entities and changed media files
- Uploads installed games list
- Can upload library ZIP and trigger full import
- Displays real-time progress and logs from the server

### Workflow
1. Start your Syncnite server  
2. Create an Admin account through the web UI  
3. Download `latest.pext` from the web UI  
4. Install the extension in Playnite  
5. Open **Syncnite Bridge → Settings**, configure:
   - **API Base:** `http://<server>:3003/api/`
   - **Admin/User email/password**

### Status Levels

**🟢 Green – Healthy**
- Server reachable.
- Server version matches extension version.
- All sync operations (push/pull/delta) are enabled.

**🟠 Orange – Version Mismatch**
- Server reachable, but versions differ.
- Sync operations are **blocked**.
- The status message explains which side is outdated:
  - *“old server version, please update server”*
  - *“old extension version, please update extension”*

**🔴 Red – Unreachable**
- Server cannot be reached, or `/ping` fails.
- No sync operations run.

## 🧠 API Overview

The API is fully documented via our OpenAPI spec.
Documentation is served at:
```
http://<server>:3003/api/docs
```

## 🏗 Architecture Notes

- **syncnite-api** (port 3004)  
  Express server handling:
  - Accounts & sessions
  - PullDelta computation
  - Binary media upload/download
  - Snapshot management

- **syncnite-web** (port 3003)  
  - Static web viewer  
  - Serves the `.pext` extension  
  - Calls the API through `/api/*`

- **PlayniteImport**  
  Bundled inside API image as a self-contained binary.

- **Live Logs**  
  Streaming via SSE on `/api/sse`.

- **Media storage**  
  All `libraryfiles` media is stored exactly like in Playnite.

## 💡 Notes

- Large ZIP uploads supported (Express + Nginx tuned)
- Syncnite Bridge uses **delta-first** sync for maximum speed
- Server enforces admin-only modifications to library data
- `/sync/media/*` supports both PUT (upload) and GET (download)

## 📜 License

MIT (unless otherwise noted)
