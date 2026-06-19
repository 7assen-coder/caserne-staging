import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9081,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.BACKEND_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 5000,
      },
      '/media': {
        target: process.env.BACKEND_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 5000,
      },
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'axios',
      'lucide-react',
    ],
  },
});
