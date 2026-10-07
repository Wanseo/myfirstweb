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
  document.addEventListener('pointerdown', event => {
    if (event.button === 0) play()
  }, { capture: true })
  document.addEventListener('click', event => {
    if (event.detail === 0) play()
  }, { capture: true })
  window.addEventListener('pagehide', () => voices.forEach(audio => audio.pause()))
}
