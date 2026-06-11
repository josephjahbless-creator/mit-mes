import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false },
      // Realtime (socket.io) flows through the SAME origin (:5173) so it works on
      // every network without extra firewall ports or backend CORS.
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {},
  },
});
