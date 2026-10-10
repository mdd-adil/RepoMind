import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[Vite Proxy Warning]: Server at http://127.0.0.1:5000 is not reachable yet:', err.message);
          });
        },
      },
    },
  },
});
