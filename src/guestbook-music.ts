// An original looping chiptune, synthesized locally without audio files.
const melody = [
  76, 79, 81, 79, 76, 74, 72, 0, 76, 79, 84, 83, 81, 79, 76, 0,
  77, 81, 84, 81, 79, 77, 76, 0, 77, 81, 86, 84, 81, 79, 77, 0,
  76, 79, 83, 79, 76, 74, 72, 0, 74, 76, 79, 81, 79, 76, 74, 0,
  74, 79, 83, 86, 84, 83, 79, 0, 81, 79, 77, 74, 72, 0, 79, 0,
]
const chords = [[48, 52, 55], [53, 57, 60], [45, 48, 52], [43, 47, 50]]

export function initGuestbookMusic(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('#guestbook-music')!
  let context: AudioContext | undefined
  let master: GainNode | undefined
  let enabled = false
  let active = false
  let timer: number | undefined
  let step = 0
  let nextNote = 0
  const voices = new Set<OscillatorNode>()
  const eighth = 60 / 104 / 2
  const updateButton = () => {
    button.textContent = enabled ? 'music on ♫' : 'music off ♫'
    button.setAttribute('aria-pressed', String(enabled))
    button.setAttribute('aria-label', enabled ? '배경 음악 끄기' : '8비트 배경 음악 켜기')
  }
  const tone = (note: number, start: number, duration: number, volume: number, type: OscillatorType) => {
    if (!note || !context || !master) return
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12)
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(volume, start + .008)
    envelope.gain.exponentialRampToValueAtTime(.001, start + duration)
    oscillator.connect(envelope).connect(master)
    voices.add(oscillator)
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect() }
    oscillator.start(start)
    oscillator.stop(start + duration + .02)
  }
  const schedule = () => {
    if (!context) return
    if (nextNote < context.currentTime) nextNote = context.currentTime + .04
    while (nextNote < context.currentTime + .15) {
      const chord = chords[Math.floor(step / 16) % chords.length]!
      tone(melody[step % melody.length]!, nextNote, eighth * .8, .12, 'square')
      tone(chord[[0, 1, 2, 1][step % 4]!]! + 12, nextNote, eighth * .65, .07, 'triangle')
      if (step % 2 === 0) tone(chord[0]!, nextNote, eighth * 1.6, .16, 'triangle')
      step = (step + 1) % melody.length
      nextNote += eighth
    }
  }
  const stop = () => {
    clearInterval(timer)
    timer = undefined
    for (const voice of voices) { try { voice.stop() } catch { /* Already ended. */ } }
    voices.clear()
    if (context?.state === 'running') void context.suspend().catch(() => {})
  }
  const sync = async () => {
    if (!enabled || !active || document.hidden) { stop(); return }
    try {
      context ??= new AudioContext()
      if (!master) { master = context.createGain(); master.gain.value = .3; master.connect(context.destination) }
      await context.resume()
      if (!enabled || !active || document.hidden) { stop(); return }
      if (timer !== undefined) return
      nextNote = context.currentTime + .04
      schedule()
      timer = window.setInterval(schedule, 50)
    } catch {
      enabled = false
      stop()
      updateButton()
    }
  }
  button.addEventListener('click', () => {
    enabled = !enabled
    if (enabled) step = 0
    updateButton()
    void sync()
  })
  document.addEventListener('visibilitychange', () => { void sync() })
  window.addEventListener('pagehide', stop)
  updateButton()
  return { setActive(next: boolean) { active = next; void sync() } }
}
