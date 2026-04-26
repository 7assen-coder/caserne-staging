# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install
RUN npm ci

# Copy the rest of the frontend code
COPY . .

# Pass the API URL to Vite at build time so it knows to hit the Nginx proxy
ENV VITE_API_BASE_URL=/api
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.30.0-alpine
# Copy the compiled files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Overwrite the default Nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
