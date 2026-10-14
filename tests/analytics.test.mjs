import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/analytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText

function setup() {
  let now = 0
  const events = []
  const listeners = {}
  const document = { hidden: false, addEventListener: (name, cb) => { listeners[name] = cb } }
  const window = { gtag: (...args) => events.push(args), addEventListener: (name, cb) => { listeners[name] = cb } }
  const context = { exports: {}, document, window, performance: { now: () => now } }
  vm.runInNewContext(source, context)
  return { ...context.exports, events, document, window, listeners, tick: ms => { now += ms } }
}

test('view changes pair starts and ends with duration and correct example', () => {
  const s = setup()
  s.trackExampleView('guestbook')
  s.tick(1200)
  s.trackExampleView('guestbook')
  assert.equal(s.events.length, 2)
  s.trackExampleView('juice')
  assert.deepEqual(s.events.map(e => e[1]), ['example_view', 'example_start', 'example_end', 'example_view', 'example_start'])
  assert.equal(s.events[2][2].duration_ms, 1200)
  assert.equal(s.events[2][2].example_id, 'guestbook')
  assert.equal(s.events[4][2].example_id, 'juice')
  assert.equal(s.events[4][2].send_to, 'G-W9LT6QTPJ4')
})

test('hidden time is excluded and pagehide does not duplicate an end', () => {
  const s = setup()
  s.trackExampleView('dodge')
  s.tick(500)
  s.document.hidden = true
  s.listeners.visibilitychange()
  s.listeners.pagehide()
  s.tick(10000)
  s.document.hidden = false
  s.listeners.visibilitychange()
  s.tick(200)
  s.listeners.pagehide()
  assert.deepEqual(s.events.filter(e => e[1] === 'example_end').map(e => e[2].duration_ms), [500, 200])
  assert.equal(s.events.at(-1)[2].reason, 'page_exit')
  s.listeners.pageshow()
  assert.equal(s.events.at(-1)[1], 'example_start')
})

test('background initial loading waits until the example becomes visible', () => {
  const s = setup()
  s.document.hidden = true
  s.trackExampleView('guestbook')
  assert.equal(s.events.length, 0)
  s.document.hidden = false
  s.listeners.visibilitychange()
  assert.equal(s.events.at(-1)[1], 'example_start')
})

test('frequent gestures are throttled independently per example and hidden events skipped', () => {
  const s = setup()
  s.trackEvent('water_touch', {}, 'watertouch', 5000)
  s.tick(100)
  s.trackEvent('water_touch', {}, 'watertouch', 5000)
  s.trackEvent('water_touch', {}, 'balloon', 5000)
  assert.equal(s.events.length, 2)
  s.tick(5000)
  s.trackEvent('water_touch', {}, 'watertouch', 5000)
  assert.equal(s.events.length, 3)
  s.document.hidden = true
  s.trackEvent('balloon_pop', {}, 'balloon')
  assert.equal(s.events.length, 3)
})

test('a missing or failing Google tag never interrupts view changes or interactions', () => {
  const s = setup()
  delete s.window.gtag
  assert.doesNotThrow(() => s.trackExampleView('claw'))
  s.window.gtag = () => { throw new Error('blocked') }
  assert.doesNotThrow(() => { s.trackEvent('claw_attempt'); s.trackExampleView('sampler'); s.listeners.pagehide() })
})
