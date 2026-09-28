import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const require = createRequire(import.meta.url)
const vitePrerender = require('vite-plugin-prerender')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getChromeExecutablePath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (process.platform === 'win32') {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    if (fs.existsSync(chromePath)) return chromePath
    if (fs.existsSync(edgePath)) return edgePath
  } else if (process.platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ]
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p
    }
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: ['/'],
      renderer: new vitePrerender.PuppeteerRenderer({
        renderAfterTime: 1000,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        executablePath: getChromeExecutablePath(),
      }),
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
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