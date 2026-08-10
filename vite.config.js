import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'pwa-icon.png'],
      manifest: {
        name: 'CityCrossed - Find Your Perfect Match Online',
        short_name: 'CityCrossed',
        description: 'Cross-platform 1-to-1 and 1-to-many calling web & mobile app',
        theme_color: '#ec4899',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})