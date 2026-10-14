import { defineConfig } from 'vite'
import { guestbookMarkup } from './src/guestbook-markup'

export default defineConfig({
  // GitHub Actions supplies the actual Pages path; local development uses '/'.
  base: process.env.BASE_PATH || '/',
  plugins: [{
    name: 'static-guestbook-html',
    transformIndexHtml(html) {
      // Share the existing UI markup with crawlers; main.ts attaches the full app as usual.
      const initialView = guestbookMarkup
        .replace('class="view guestbook-view"', 'class="view guestbook-view is-active"')
        .replace('aria-hidden="true" hidden', 'aria-hidden="false"')
      return html.replace('<div id="app"></div>', `<div id="app">${initialView}</div>`)
    },
  }],
  optimizeDeps: {
    include: ['html2canvas'],
  },
})
