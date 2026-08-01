import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default {
  // ... baaki config
  server: {
    port: 5173,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
}