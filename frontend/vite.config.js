import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true, allowedHosts: ['.trycloudflare.com'] },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendors into their own chunks so a small app change
        // doesn't bust the whole cached bundle. recharts is NOT listed here on
        // purpose: it's only reached via lazy imports (BarSheet/BarDetail), so
        // Rollup already keeps it out of the initial load.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
