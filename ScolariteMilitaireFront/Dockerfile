# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
RUN npm ci

COPY . .

# Production public API: https://api.gesesp.com/api
ARG VITE_API_BASE_URL=/api
ARG VITE_FRONTEND_ONLY=false
ARG VITE_USE_MOCK_ELEVES=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FRONTEND_ONLY=$VITE_FRONTEND_ONLY
ENV VITE_USE_MOCK_ELEVES=$VITE_USE_MOCK_ELEVES
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.30.0-alpine
ARG NGINX_CONF=nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
