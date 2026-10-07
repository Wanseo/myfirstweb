export function initClickSound() {
  const voices = Array.from({ length: 4 }, () => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/click.mp3`)
    audio.preload = 'auto'
    audio.volume = 1
    return audio
  })
  let nextVoice = 0
  const play = () => {
    const audio = voices[nextVoice]!
    nextVoice = (nextVoice + 1) % voices.length
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }
  let touch: { id: number; x: number; y: number; moved: boolean; button: HTMLButtonElement | null } | undefined
  let handledButton: HTMLButtonElement | null = null
  let handledAt = 0
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
        button: event.target instanceof Element ? event.target.closest('button') : null }
    } else if (event.button === 0) play()
  }, { capture: true })
  document.addEventListener('pointermove', event => {
    if (touch?.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) touch.moved = true
  }, { capture: true, passive: true })
  document.addEventListener('pointercancel', () => { touch = undefined }, { capture: true })
  document.addEventListener('pointerup', event => {
    if (!touch || touch.id !== event.pointerId) return
    const tap = touch
    touch = undefined
    if (tap.moved) return
    play()
    const releasedButton = document.elementFromPoint(event.clientX, event.clientY)?.closest('button')
    if (matchMedia('(max-width: 700px)').matches && tap.button && releasedButton === tap.button && !tap.button.disabled) {
      handledButton = tap.button
      handledAt = performance.now()
      tap.button.click()
    }
  }, { capture: true })
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null
    if (event.isTrusted && button && button === handledButton && performance.now() - handledAt < 700) {
      event.preventDefault()
      event.stopImmediatePropagation()
      handledButton = null
      return
    }
    if (event.isTrusted && event.detail === 0) play()
  }, { capture: true })
  window.addEventListener('pagehide', () => voices.forEach(audio => audio.pause()))
}
