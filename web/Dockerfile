# -------- Build stage --------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/tsconfig.json web/index.html web/
COPY web/vite.config.mts web/vite.config.mts
COPY web/src web/src

RUN npm ci --include-workspace-root=false --workspace web
RUN npm run -w web build

# -------- Runtime stage --------
FROM nginx:alpine

# Your nginx config (should listen on 3003 and proxy /api → api:3004 if needed)
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# Static build output
COPY --from=build /app/web/dist/ /usr/share/nginx/html/

# Entrypoint that writes /usr/share/nginx/html/env.js with APP_VERSION
COPY web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3003

# Default can be overridden by compose
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

ENTRYPOINT ["/entrypoint.sh"]
