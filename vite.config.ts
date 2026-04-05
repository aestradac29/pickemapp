import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite expone automáticamente al cliente todas las variables de entorno
// que empiecen por VITE_ (ej: VITE_FIREBASE_API_KEY, VITE_GEMINI_API_KEY).
// No hace falta ningún `define` manual: basta con declarar las variables
// en .env.local (desarrollo) o en el panel de Vercel (producción).

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
