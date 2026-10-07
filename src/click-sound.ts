export function initClickSound() {
  const voices = Array.from({ length: 4 }, () => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/click.mp3`)
    audio.preload = 'auto'
    audio.volume = 0.45
    return audio
  })
  let nextVoice = 0
  document.addEventListener('click', () => {
    const audio = voices[nextVoice]!
    nextVoice = (nextVoice + 1) % voices.length
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }, { capture: true })
  window.addEventListener('pagehide', () => voices.forEach(audio => audio.pause()))
}
