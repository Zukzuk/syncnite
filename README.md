# Playnite Viewer

A self-hosted web viewer for your [Playnite](https://playnite.link) library with an optional Playnite extension that can live-update the “installed games” list.

## Overview

| Component | Description |
|-----------|------------|
| **`web/`** | React + Vite single-page app to browse the exported Playnite library (`/data`). |
| **`api/`** | Node/Express API with OpenAPI 3 docs. Handles: <ul><li>uploading & processing Playnite backup ZIPs (unzips, dumps LiteDB to JSON, copies media)</li><li>serving the processed JSON/media files</li><li>receiving live “installed games” pushes from the Playnite extension</li><li>serving the packaged Playnite extension (.pext)</li></ul> |
| **`playnite/SyncniteBridge`** | Playnite extension (Syncnite Bridge”) that pushes the list of installed games to the API endpoint. |
| **`playnite/PlayniteBackupImport`** | .NET 8.0 tool that converts Playnite’s LiteDB `.db` files to JSON (used by the API). |

## Quick start (Docker)

```bash
# build and start API + web with local volumes
npm install
npm run up
```

This uses [`docker-compose.yml`](docker-compose.yml) to:

* **API** → <http://localhost:3004>  
  * Swagger / OpenAPI docs: <http://localhost:3004/api/docs>
* **Web UI** → <http://localhost:3003>

Volumes:

| Host folder   | Container path | Purpose |
|---------------|---------------|--------|
| `./uploads`   | `/input`      | drop Playnite ZIP uploads here for import |
| `./data`      | `/data`       | JSON + media output |
| `./extension` | `/extension`  | the built Playnite extension package |

## Processing a Playnite backup

1. Upload a ZIP via **POST `/api/syncnite/backup/upload`** or drop it in `./uploads`.
2. Start processing with **GET `/api/syncnite/backup/process-stream?filename=your.zip`**.  
   This is a Server-Sent Events (SSE) stream that emits:
   * `log` – text messages
   * `progress` – `{ phase: "unzip" | "copy", percent, … }`
   * `done` – `"ok"` when finished
3. The resulting JSON and media appear in `./data` and are served by the web app.

## Live “installed” updates (optional)

Install the **Syncnite Bridge** extension:

* Download from <http://localhost:3004/api/extension/download>
* In Playnite, add the `.pext` and configure the API endpoint (defaults to `http://localhost:3003/api/syncnite/live/push`).

The extension watches Playnite’s database and pushes the list of currently installed games to the API, which writes it to `data/local.playnite.installed.json`.  
The web UI automatically reflects these updates.

## Development

### API

```bash
cd api
npm install
npm run dev      # ts-node-dev
```

* Express + TypeScript
* Swagger docs auto-generated from JSDoc comments.

### Web

```bash
cd web
npm install
npm run dev      # Vite dev server on :5173
```

### Extension

The extension is built into `./extension/latest.pext` by:

```bash
npm run build:ext
```

(`scripts/build-ext.js` handles packaging the Playnite plugin.)

---

**License:** MIT (adjust as appropriate)
