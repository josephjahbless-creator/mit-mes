import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend target for the REST API. Defaults to the Laravel backend (:8000).
// (Override with API_TARGET=http://localhost:5000 to fall back to Node.)
// Real-time now runs on Laravel Reverb (Echo connects directly to :8081), so the
// old /socket.io proxy is gone.
const API_TARGET = process.env.API_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'use-sync-external-store/shim/with-selector.js': path.resolve(
        __dirname,
        'src/shims/use-sync-external-store-shim.js'
      ),
      'use-sync-external-store/shim/with-selector': path.resolve(
        __dirname,
        'src/shims/use-sync-external-store-shim.js'
      ),
      'use-sync-external-store/with-selector.js': path.resolve(
        __dirname,
        'src/shims/use-sync-external-store-shim.js'
      ),
      'use-sync-external-store/with-selector': path.resolve(
        __dirname,
        'src/shims/use-sync-external-store-shim.js'
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle zustand so the shim is baked in at build time (content-hash URL,
    // prevents stale-cache issues that occur when serving raw node_modules ESM).
    include: ['zustand', 'zustand/middleware'],
  },
  server: {
    host: '0.0.0.0',
    // Allow access via any hostname/IP (work Wi-Fi, hotspot, localhost). Vite's
    // strict host check otherwise blocks non-localhost Host headers in newer versions.
    allowedHosts: true,
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: false },
      '/uploads': { target: API_TARGET, changeOrigin: true, secure: false },
      // Real-time is served by Laravel Reverb; Laravel Echo connects directly to
      // ws://<host>:8081, so no websocket proxy is needed here.
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {},
  },
});
