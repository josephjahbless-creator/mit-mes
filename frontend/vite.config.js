import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': { target: 'https://localhost:5443', changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: { crossOriginLoading: false },
    },
  },
});
