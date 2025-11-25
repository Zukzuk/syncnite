FROM node:20-alpine AS api-build
WORKDIR /app

# Tools we also need at runtime (kept here to share cache)
RUN apk add --no-cache p7zip icu-libs

# Root lockfile (workspaces) + root package.json
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY api/tsconfig.json ./api/tsconfig.json
COPY api/src ./api/src

# Install deps only for API workspace using the root lockfile
RUN npm ci --workspaces --include-workspace-root=false --workspace api
RUN npm run --workspace api build

FROM node:20-alpine
WORKDIR /app

# Runtime system deps for the dumper and 7z
RUN apk add --no-cache p7zip icu-libs

# Bring built API and dependencies
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/api/dist ./api/dist
COPY api/src/openapi/openapi.yaml ./api/dist/openapi/openapi.yaml

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

ENV NODE_ENV=production
EXPOSE 3004
WORKDIR /app/api
CMD ["node", "dist/server.js"]
