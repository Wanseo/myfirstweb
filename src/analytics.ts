export type ExampleId = 'guestbook' | 'orbi' | 'juice' | 'dodge' | 'claw' | 'sampler' | 'watertouch' | 'balloon'
type Params = Record<string, string | number | boolean>
let currentExample: ExampleId | undefined
let startedAt: number | undefined
let segment = 0
const lastEvents = new Map<string, number>()

// Fixed metadata only: never send text inputs, images, audio, or error messages.
export const trackEvent = (name: string, params: Params = {}, example = currentExample, cooldownMs = 0) => {
  if (!example || document.hidden) return
  const key = `${example}:${name}`
  const now = performance.now()
  if (cooldownMs && now - (lastEvents.get(key) ?? -Infinity) < cooldownMs) return
  lastEvents.set(key, now)
  try {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
    gtag?.('event', name, { ...params, example_id: example, send_to: 'G-W9LT6QTPJ4', transport_type: 'beacon' })
  } catch { /* Analytics must never interrupt an experience. */ }
}

const startSegment = (reason: string) => {
  if (!currentExample || document.hidden || startedAt !== undefined) return
  if (segment === 0 && reason !== 'view_open') trackEvent('example_view')
  startedAt = performance.now()
  segment += 1
  trackEvent('example_start', { reason, segment })
}

const endSegment = (reason: string) => {
  if (!currentExample || startedAt === undefined) return
  const duration = Math.max(0, Math.round(performance.now() - startedAt))
  startedAt = undefined
  // visibilitychange fires after document.hidden becomes true; send the final event directly.
  try {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
    gtag?.('event', 'example_end', {
      example_id: currentExample, send_to: 'G-W9LT6QTPJ4', duration_ms: duration, reason, segment, transport_type: 'beacon',
    })
  } catch { /* Best effort during page exit. */ }
}

export const trackExampleView = (example: ExampleId) => {
  if (currentExample === example) return
  endSegment('view_change')
  currentExample = example
  segment = 0
  trackEvent('example_view')
  startSegment('view_open')
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) endSegment('tab_hidden')
  else startSegment('tab_visible')
})
window.addEventListener('pagehide', () => endSegment('page_exit'))
window.addEventListener('pageshow', () => startSegment('page_show'))
