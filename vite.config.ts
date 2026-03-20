import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

if (!process.env.VITE_MAPBOX_TOKEN) {
  throw new Error("VITE_MAPBOX_TOKEN is required")
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
