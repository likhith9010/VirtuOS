import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron to load assets correctly
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  optimizeDeps: {
    exclude: ['@novnc/novnc'], // Exclude noVNC from pre-bundling due to top-level await
    esbuildOptions: {
      target: 'esnext' // Support top-level await
    }
  }
})
