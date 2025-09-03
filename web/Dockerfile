# web/Dockerfile (monorepo-root context)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/tsconfig.json web/index.html web/
COPY web/vite.config.mts web/vite.config.mts
COPY web/src web/src

RUN npm ci --include-workspace-root=false --workspace web
RUN npm run -w web build

FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist/ /usr/share/nginx/html/

