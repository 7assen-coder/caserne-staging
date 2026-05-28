import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 9081,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_PROXY ?? 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.BACKEND_PROXY ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
