import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Keep in sync with src/services/apiConstants.js VITE_PROXY_TIMEOUT_MS */
const VITE_PROXY_TIMEOUT_MS = 120_000;

export default defineConfig({
  plugins: [react()],
  // Phase 20: hashed files under /assets/ for immutable long-cache at nginx/CDN.
  build: {
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: true,
    // Phase 28: split heavy vendors so login/shell does not pull jspdf/xlsx/recharts.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('/recharts/') || id.includes('/victory-') || id.includes('/d3-')) {
            return 'vendor-charts';
          }
          if (
            id.includes('/jspdf') ||
            id.includes('/xlsx') ||
            id.includes('/docx/') ||
            id.includes('/pptxgenjs') ||
            id.includes('/file-saver') ||
            id.includes('/pdf-lib')
          ) {
            return 'vendor-export';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 9081,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.BACKEND_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: VITE_PROXY_TIMEOUT_MS,
        proxyTimeout: VITE_PROXY_TIMEOUT_MS,
      },
      '/media': {
        target: process.env.BACKEND_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: VITE_PROXY_TIMEOUT_MS,
        proxyTimeout: VITE_PROXY_TIMEOUT_MS,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'axios',
      'lucide-react',
      'pdf-lib',
      'i18next',
      'react-i18next',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'hoist-non-react-statics',
      '@tanstack/react-query',
    ],
  },
});
