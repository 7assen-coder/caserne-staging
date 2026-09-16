# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
# Phase 39 — lockfile only (never npm install in images/CI)
# .npmrc sets legacy-peer-deps for eslint@10 vs jsx-a11y peer range
RUN npm ci

COPY . .

# Production public API: https://api.polyspace.mr/api
# Staging: https://gesesp-api.onrender.com/api + VITE_APP_ENV=staging
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_FRONTEND_ONLY=false
ARG VITE_USE_MOCK_ELEVES=false
ARG VITE_APP_ENV=production
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_TRACES_SAMPLE_RATE=0
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FRONTEND_ONLY=$VITE_FRONTEND_ONLY
ENV VITE_USE_MOCK_ELEVES=$VITE_USE_MOCK_ELEVES
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.30.0-alpine
ARG NGINX_CONF=nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
