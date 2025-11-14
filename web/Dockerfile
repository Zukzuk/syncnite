# -------- Build stage --------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/tsconfig.json web/index.html web/
COPY web/vite.config.mts web/vite.config.mts
COPY web/src web/src
COPY web/public web/public

RUN npm ci --include-workspace-root=false --workspace web
RUN npm run -w web build

# -------- Runtime stage --------
FROM nginx:alpine

COPY --from=build /app/web/dist/ /usr/share/nginx/html/
COPY web/default.conf /etc/nginx/conf.d/default.conf
COPY web/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3003
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENTRYPOINT ["/entrypoint.sh"]
