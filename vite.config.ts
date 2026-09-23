import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 3000 is on the API's CORS allow-list (fallback); the proxy makes the API same-origin in dev
    // so the HttpOnly SameSite=Strict refresh cookie just works (kickoff §3.3).
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
})
