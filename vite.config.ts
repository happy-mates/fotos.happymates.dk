import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Custom domain (fotos.happymates.dk) => site serves from root
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        handelsbetingelser: resolve(__dirname, 'handelsbetingelser.html'),
        privatlivspolitik: resolve(__dirname, 'privatlivspolitik.html'),
      },
    },
  },
})
