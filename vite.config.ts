import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  optimizeDeps: {
    include: ['html2canvas'],
  },
})
