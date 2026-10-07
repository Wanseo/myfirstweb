import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Actions supplies the actual Pages path; local development uses '/'.
  base: process.env.BASE_PATH || '/',
  optimizeDeps: {
    include: ['html2canvas'],
  },
})
