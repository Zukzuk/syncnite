/**
 * @openapi
 * openapi: 3.0.3
 * info:
 *   title: Syncnite API
 *   version: 1.0.0
 *   description: >
 *     Unified API for the Syncnite Bridge Playnite extension and web app.
 *     All logs and progress events are streamed live via `/api/sse`.
 *
 * servers:
 *   - url: /api
 *
 * tags:
 *   - name: App
 *     description: General endpoints and live event stream.
 *   - name: Accounts
 *     description: Admin registration, login, and verification.
 *   - name: Backup
 *     description: Upload and process Playnite backups.
 *   - name: Sync
 *     description: Endpoints used by the Syncnite Bridge extension.
 *   - name: Extension
 *     description: Download the Syncnite Bridge extension package.
 *
 * components:
 *   securitySchemes:
 *     XAuthEmail:
 *       type: apiKey
 *       in: header
 *       name: X-Auth-Email
 *     XAuthPassword:
 *       type: apiKey
 *       in: header
 *       name: X-Auth-Password
 *
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: reason
 *
 *     PingResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: ok
 *         version:
 *           type: string
 *           example: v1.0.0
 *
 *     ZipFile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: 2025-09-20-23-10.zip
 *         sizeBytes:
 *           type: integer
 *           example: 12345678
 *         mtime:
 *           type: string
 *           format: date-time
 *
 *     UploadResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         file:
 *           type: string
 *           example: 2025-09-20-23-10.zip
 *
 *     LogEvent:
 *       type: object
 *       description: A log record emitted by the Syncnite Bridge extension.
 *       properties:
 *         ts:
 *           type: string
 *           format: date-time
 *           example: 2025-09-20T23:10:12.345Z
 *         level:
 *           type: string
 *           enum: [trace, debug, info, warn, error, fatal]
 *           example: info
 *         kind:
 *           type: string
 *           example: progress
 *         msg:
 *           type: string
 *           example: Copying media
 *         data:
 *           type: object
 *           additionalProperties: true
 *           example: { "percent": 42 }
 *         err:
 *           type: string
 *           example: LiteDB password invalid
 *         ctx:
 *           type: object
 *           additionalProperties: true
 *           example: { "installId": "abcd-1234" }
 *         src:
 *           type: string
 *           example: playnite-extension
 *
 *     PushInstalledRequest:
 *       type: object
 *       required: [installed]
 *       properties:
 *         installed:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["b3e6b9c8-6e2f-4b15-9a3e-1c9f1ab81234"]
 *
 *     OkCountResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 2
 *
 *     SyncUpResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         jsonFiles:
 *           type: integer
 *           example: 7
 *         mediaFiles:
 *           type: integer
 *           example: 154
 *         upload:
 *           type: object
 *           nullable: true
 *           properties:
 *             savedZip:
 *               type: string
 *               example: /uploads/2025-09-20-23-10.zip
 *             sizeBytes:
 *               type: integer
 *               example: 12345678
 *
 *   responses:
 *     Error400:
 *       description: Bad request.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error401:
 *       description: Unauthorized.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error404:
 *       description: Not found.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error413:
 *       description: Payload too large.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error423:
 *       description: Resource busy.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Error500:
 *       description: Server error.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 * paths:
 *   /zips:
 *     get:
 *       summary: List uploaded ZIPs
 *       tags: [App]
 *       responses:
 *         200:
 *           description: ZIP metadata.
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ZipFile'
 *               examples:
 *                 sample:
 *                   value:
 *                     - { "name": "2025-10-12-12-00.zip", "sizeBytes": 123456, "mtime": "2025-10-12T10:00:00.000Z" }
 *                     - { "name": "2025-10-10-09-30.zip", "sizeBytes": 987654, "mtime": "2025-10-10T07:30:00.000Z" }
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /sse:
 *     get:
 *       summary: Subscribe to live logs and progress (SSE)
 *       tags: [App]
 *       responses:
 *         200:
 *           description: Server-Sent Events stream.
 *           headers:
 *             Content-Type:
 *               schema:
 *                 type: string
 *               example: text/event-stream
 *           content:
 *             text/event-stream:
 *               schema:
 *                 type: string
 *                 example: |-
 *                   event: log
 *                   data: started
 *
 *                   event: progress
 *                   data: {"phase":"copy","percent":42}
 *
 *   /accounts/register:
 *     post:
 *       summary: Register admin
 *       tags: [Accounts]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 password:
 *                   type: string
 *       responses:
 *       responses:
 *         200:
 *           description: Registered.
 *           content:
 *             application/json:
 *               schema: { type: object, properties: { ok: { type: boolean, example: true } } }
 *         201:
 *           description: Registered.
 *         409:
 *           description: Admin already exists.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 *
 *   /accounts/login:
 *     post:
 *       summary: Log in
 *       tags: [Accounts]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email: { type: string }
 *                 password: { type: string }
 *       responses:
 *         200:
 *           description: Login successful.
 *           content:
 *             application/json:
 *               schema: { type: object, properties: { ok: { type: boolean, example: true } } }
 *         401:
 *           $ref: '#/components/responses/Error401'
 *
 *   /accounts/verify:
 *     get:
 *       summary: Verify credentials
 *       tags: [Accounts]
 *       security:
 *         - XAuthEmail: []
 *         - XAuthPassword: []
 *       responses:
 *         200:
 *           description: Verified.
 *         401:
 *           $ref: '#/components/responses/Error401'
 *
 *   /accounts/status:
 *     get:
 *       summary: Admin status
 *       tags: [Accounts]
 *       responses:
 *         200:
 *           description: Returns whether an admin exists.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   hasAdmin: { type: boolean, example: false }
 *                   admin: { type: string, nullable: true, example: null }
 *
 *   /backup/upload:
 *     post:
 *       summary: Upload a Playnite ZIP
 *       tags: [Backup]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   type: string
 *                   format: binary
 *       responses:
 *         200:
 *           description: Upload successful.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/UploadResult'
 *               examples:
 *                 ok: { value: { ok: true, file: "2025-10-12-12-00.zip" } }
 *         400:
 *           $ref: '#/components/responses/Error400'
 *         413:
 *           $ref: '#/components/responses/Error413'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /backup/process:
 *     post:
 *       summary: Process uploaded ZIP
 *       description: >
 *         Unzips, dumps LiteDB to JSON, copies media.  
 *         Progress/logs appear on `/app/sse`.
 *       tags: [Backup]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filename: { type: string }
 *                 password: { type: string, nullable: true }
 *       responses:
 *         200:
 *           description: Process started.
 *           content:
 *             application/json:
 *               schema: { type: object, properties: { ok: { type: boolean, example: true } } }
 *         400:
 *           $ref: '#/components/responses/Error400'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /sync/ping:
 *     get:
 *       summary: Ping
 *       tags: [Sync]
 *       security:
 *         - XAuthEmail: []
 *         - XAuthPassword: []
 *       responses:
 *         200:
 *           description: Pong.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PingResponse'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /sync/log:
 *     post:
 *       summary: Ingest logs
 *       tags: [Sync]
 *       security:
 *         - XAuthEmail: []
 *         - XAuthPassword: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/LogEvent'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/LogEvent'
 *       responses:
 *         204:
 *           description: Accepted.
 *         400:
 *           $ref: '#/components/responses/Error400'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /sync/push:
 *     post:
 *       summary: Push installed IDs
 *       tags: [Sync]
 *       security:
 *         - XAuthEmail: []
 *         - XAuthPassword: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PushInstalledRequest'
 *       responses:
 *         200:
 *           description: Write result.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/OkCountResult'
 *         400:
 *           $ref: '#/components/responses/Error400'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /sync/up:
 *     post:
 *       summary: Sync upload
 *       tags: [Sync]
 *       security:
 *         - XAuthEmail: []
 *         - XAuthPassword: []
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   type: string
 *                   format: binary
 *       responses:
 *         200:
 *           description: Sync accepted.
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/SyncUpResult'
 *         423:
 *           $ref: '#/components/responses/Error423'
 *         500:
 *           $ref: '#/components/responses/Error500'
 *
 *   /extension/download:
 *     get:
 *       summary: Download the Syncnite Bridge (.pext)
 *       tags: [Extension]
 *       responses:
 *         200:
 *           description: The extension package.
 */
