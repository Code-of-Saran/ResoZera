import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend URL for the dev proxy (override with RESOZERA_API=http://host:port npm run dev)
const API = process.env.RESOZERA_API || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': API,
      '/outputs': API,
    },
  },
})
