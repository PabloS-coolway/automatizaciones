import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@yorga/contracts': fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // El front llama a /api y Vite lo redirige a la API NestJS en desarrollo.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
