# Syncnite — project overview & workflows

Syncnite lets you export your [Playnite](https://playnite.link) library (games + media) from Windows and serve it anywhere via a tiny web UI and JSON snapshots. A companion Playnite extension, Syncnite Bridge, can push your currently installed games and upload your latest backup straight from Playnite.

## What you can do

- Browse your library on the web — fast, searchable view of your Playnite export.
- Keep JSON snapshots of Playnite’s LiteDB contents for reuse in other tools.
- One‑click upload from Playnite via Syncnite Bridge (push installed list + upload ZIP).
- Self‑host easily (Docker images provided), or run locally for dev.

## The Playnite extension: Syncnite Bridge

- Purpose: from inside Playnite, push the list of installed games and upload a new ZIP (your Playnite export + media) to your Syncnite server.

- Setup
  - Start your Syncnite server (see “Run” below) so it serves /extension/latest.pext.
  - In Playnite, install that .pext (e.g. http://<server>:3003/extension/latest.pext).
  - In Syncnite Bridge Settings, set:
    - API base: http://<server>:3003/api/
    - Admin email & password (same creds you set on the web admin page).
- Use: Click Push installed or Sync now in the extension UI; it will authenticate and upload.

## Workflow

All scripts are at the repo root. They orchestrate the workspaces (api, web) and packaging.

### Install deps (monorepo)
```
npm run i:all
```
Installs workspaces and the root.

### Run app
```
npm run up
```
Run complete stack

### Conventional commits
```
npm run commit
```
Uses Commitizen with the conventional changelog adapter.

### Build 
```
npm run build
```
Performs in order: set version → build API & Web workspaces → build the Playnite .pext → refresh the codebase summary.

### Push code
```
npm run push
```
Pushes current branch + tags.

### Release Docker images
```
npm run release
```
Builds and pushes the api and web docker images, tagging with the current version.

### Using prebuilt images
```
cd deploy
docker compose up -d
```
Mount your host paths under /uploads, /data, /extension.

### Clean
```
npm run clean
```
Cleans generated artifacts used by the build/release flow.

## Useful endpoints (when self‑hosting)

Web: http://<host>:3003/
Download extension: http://<host>:3003/extension/latest.pext
API Swagger: http://<host>:3004/api/docs

## Notes

ZIPs can be large; Nginx is configured for big uploads and long timeouts.

If your Playnite DB is password‑protected, pass password=... when processing; the dumper respects LITEDB_PASSWORD.

The served .pext name includes the app version; the API resolves /extension/latest.pext dynamically.

## License

MIT (unless noted otherwise in subfolders).