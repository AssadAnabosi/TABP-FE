# syntax=docker/dockerfile:1

# ---- build: typecheck + Vite production build ----
FROM oven/bun:1.4-alpine AS build
WORKDIR /app

# Dependencies first, so source-only changes reuse this layer.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Empty = same origin: nginx below proxies /api to the backend (kickoff §5.4).
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN bun run build

# ---- runtime: static files + /api reverse proxy ----
FROM nginx:1.29-alpine

# Rendered by the image's entrypoint (envsubst) into /etc/nginx/conf.d/default.conf at start-up.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Where /api is forwarded; the service name on the backend's Docker network by default.
ENV API_UPSTREAM=http://api:8080
# Only ${API_UPSTREAM} is substituted, so nginx's own $variables survive envsubst.
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
