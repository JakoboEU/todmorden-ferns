import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/todmorden-ferns/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})