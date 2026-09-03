import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/todmorden-ferns/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
}))