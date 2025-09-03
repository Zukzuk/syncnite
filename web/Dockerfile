# Build the tiny TS client
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# Serve with nginx; mount /data from the worker via compose
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
# /usr/share/nginx/html/data will be provided by the volume
