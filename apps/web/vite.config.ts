import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: {
    port: 5173,
    // En desarrollo, /api va a la API local: sin problemas de CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
