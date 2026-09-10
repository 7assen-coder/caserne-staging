# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install
RUN npm ci

# Copy the rest of the frontend code
COPY . .

# Build-time API URL (Render static/docker: set VITE_API_BASE_URL=https://caserne-api.onrender.com/api)
ARG VITE_API_BASE_URL=/api
ARG VITE_FRONTEND_ONLY=false
ARG VITE_USE_MOCK_ELEVES=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FRONTEND_ONLY=$VITE_FRONTEND_ONLY
ENV VITE_USE_MOCK_ELEVES=$VITE_USE_MOCK_ELEVES
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.30.0-alpine
# Copy the compiled files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Overwrite the default Nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
