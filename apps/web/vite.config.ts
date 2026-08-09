import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            // Cache API responses (inspect results, etc.)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'M2P — Media Server 2 Peer',
        short_name: 'M2P',
        description:
          'Media Server 2 Peer — the shortest path from media you found to the piece you need.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#a00000',
        icons: [
          {
            src: '/m2p-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend during local dev
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/version': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})