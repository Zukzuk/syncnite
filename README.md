# Syncnite — self-hosted Playnite library sync + web viewer

Syncnite lets you share your [Playnite](https://playnite.link) library (games, media, and metadata) with family members. You can serve it anywhere via a lightweight web UI and JSON snapshots.  
It comes with a companion Playnite extension — **Syncnite Bridge** — to syncs the admin's library directly from Playnite with one click.

## 🔧 What Syncnite does

- **Serve your Playnite library on the web**
  - Fast, searchable JSON-based viewer.
  - Supports live logs and progress via SSE.
- **Create and keep JSON snapshots** of Playnite’s LiteDB contents for reuse.
- **Push from Playnite via Syncnite Bridge**
  - Syncs library ZIP and installed games list.
- **Self-host easily**
  - Docker Compose stack (`api`, `web`, `.pext` builder).
  - Runs locally or on any small server.

## ⚙️ Developer workflows

All orchestration scripts live in the repo root and manage the workspaces (`api`, `web`, extension builder).

### Run the full stack (API + web)
```bash
npm run up
```

### Install all dependencies
```bash
npm run i:all
```

### Build all components
```bash
npm run build
```
Builds the API, web, and `.pext` extension; updates version and summary.

### Conventional commits
```bash
npm run commit
```

### Push current branch + tags
```bash
npm run push
```

### Release Docker images
```bash
npm run release
```
Builds and pushes `api` and `web` Docker images, tagged with the current version.

### Clean generated artifacts
```bash
npm run clean
```

## 🧩 Components

| Component | Description |
|-----------|-------------|
| **syncnite-api** | Node.js/TypeScript backend (Express). Handles uploads, processing, and API routes. |
| **syncnite-web** | Minimal web frontend to browse the library. |
| **PlayniteImport** | .NET 8 dumper that converts Playnite’s LiteDB to JSON. |
| **Syncnite Bridge** | Playnite extension (`.pext`) to push installed games and sync library ZIPs. |


## 🚀 Syncnite Bridge (Playnite extension)

**Purpose:** from inside Playnite, push your installed games list and upload library ZIP to your Syncnite server.

### Setup

1. Start your Syncnite server
2. Create an Admin account
3. Download the extension `.pext` 
4. In Playnite, install the extension `.pext`
5. In Playnite menu, open **Syncnite Bridge**, configure:
   - **API base:** `http://<server>:3003/api/`
   - **Admin email/password:** same as the registered Admin

### Convenience (not needed)
- **Push installed** → writes `Installed.json` on the server.
- **Sync now** → uploads ZIP and triggers import.
- View live progress/logs streamed from `/api/sse`.

## 🧠 API overview

The backend exposes a clean OpenAPI-documented API:

| Area | Example endpoints |
|------|-------------------|
| **General** | `/api/zips`, `/api/sse` |
| **Accounts** | `/api/accounts/register`, `/api/accounts/login`, `/api/accounts/verify` |
| **Backup** | `/api/backup/upload`, `/api/backup/process` |
| **Sync** | `/api/sync/push`, `/api/sync/up`, `/api/sync/log` |
| **Extension** | `/api/extension/download` |

Docs available at:  
**<http://<server>:3003/api/docs>**

## 🧠 Architecture notes

- The **API** runs on port `3004` and is a TypeScript/Express service.
- The **web UI** runs on port `3003` and serves the `.pext` plus library viewer.
- **PlayniteImport** (.NET 8) is built as a self-contained binary inside the API image.
- **Logs and progress** are streamed through `/api/sse` to the frontend.
- All paths (uploads, workdir, data) are configurable constants in `api/src/constants.ts`.

## 📂 Useful endpoints (when self-hosting)

| Purpose | URL |
|---------|-----|
| Web app | `http://<host>:3003/` |
| Download Playnite extension | `http://<host>:3003/extension/latest.pext` |
| API Swagger docs | `http://<host>:3004/api/docs` |
| Live logs/progress (SSE) | `http://<host>:3004/api/sse` |

---

## 🧱 Data locations

| Path | Description |
|------|-------------|
| `/uploads` | Uploaded Playnite ZIPs |
| `/data` | Processed JSON + media |
| `/data/manifest.json` | Current manifest built from `/data/libraryfiles` |
| `/data/installed/*.Installed.json` | Installed list pushed from Playnite |
| `/extension` | Packaged `.pext` extension served by `/api/extension/download` |

---

## 🧩 Notes

- Large ZIP uploads are supported (Nginx / Express body limits tuned).
- If your Playnite DB is password-protected, set `LITEDB_PASSWORD` when importing.
- The `.pext` name reflects the app version, but `/extension/latest.pext` always resolves to the latest build.

---

## 📜 License

MIT (unless otherwise noted in subfolders)
