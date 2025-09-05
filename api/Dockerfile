# api/Dockerfile

# ---------- Stage 1: build API (TypeScript -> dist) ----------
FROM node:20-alpine AS api-build
WORKDIR /app

# Tools we also need at runtime (kept here to share cache)
RUN apk add --no-cache p7zip icu-libs

# Root lockfile (workspaces) + root package.json
COPY package.json package-lock.json ./

# Only bring API workspace sources
COPY api/package.json ./api/package.json
COPY api/tsconfig.json ./api/tsconfig.json
COPY api/src ./api/src

# Install deps only for API workspace using the root lockfile
RUN npm ci --workspaces --include-workspace-root=false --workspace api

# Build TS -> dist (outputs to /app/api/dist)
RUN npm run --workspace api build

# ---------- Stage 2: build PlayniteDump as a single file for Alpine (musl) ----------
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS dump-build
WORKDIR /src
COPY worker/PlayniteDump/ PlayniteDump/
# Publish self-contained, single-file for the current arch (x64/arm64)
ARG TARGETARCH
RUN set -eux; \
    if [ "$TARGETARCH" = "arm64" ]; then RID=linux-musl-arm64; else RID=linux-musl-x64; fi; \
    dotnet publish PlayniteDump/PlayniteDump.csproj \
    -c Release \
    -o /out \
    -r $RID \
    --self-contained true \
    /p:PublishSingleFile=true \
    /p:IncludeNativeLibrariesForSelfExtract=true

# ---------- Stage 3: runtime image ----------
FROM node:20-alpine
WORKDIR /app

# Runtime system deps for the dumper and 7z
RUN apk add --no-cache p7zip icu-libs

# Bring built API and dependencies
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/api/dist ./api/dist

# Bring PlayniteDump (self-contained musl binary)
COPY --from=dump-build /out/PlayniteDump ./api/PlayniteDump
RUN chmod +x ./api/PlayniteDump

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/api
CMD ["node", "dist/server.js"]
