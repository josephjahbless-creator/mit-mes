import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend target for the REST API. Defaults to the Laravel backend.
// Use 127.0.0.1 (not "localhost") on purpose: localhost resolves to IPv6 (::1)
// first, but `php artisan serve` listens on IPv4 only, so "localhost" wastes
// ~200ms per request on a failed IPv6 connect before falling back. 127.0.0.1
// skips that entirely.
// (Override with API_TARGET=http://127.0.0.1:5000 to fall back to Node.)
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8000';

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
