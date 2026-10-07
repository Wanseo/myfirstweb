const PAD_KEYS = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'] as const
type PadKey = (typeof PAD_KEYS)[number]

type PadSettings = { pitch: number; speed: number }
type Pad = { key: PadKey; button: HTMLButtonElement; sourceLabel: HTMLElement; buffer: AudioBuffer | null; settings: PadSettings }
type RecordedPadEvent = PadSettings & { key: PadKey; time: number }
type Recording = { id: string; name: string; duration: number; layers: number; events: RecordedPadEvent[] }
type LoopState = { recordingId: string; nextCycleAt: number; interval: number; sources: Set<AudioBufferSourceNode> }

const STORAGE_KEY = 'interactiveclass-sampler-recordings-v1'
const isPadKey = (key: string): key is PadKey => PAD_KEYS.includes(key as PadKey)
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const loadStoredRecordings = (): Recording[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): Recording[] => {
      if (!item || typeof item !== 'object') return []
      const candidate = item as Partial<Recording>
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.events)) return []
      const events = candidate.events.flatMap((event): RecordedPadEvent[] => {
        if (!event || typeof event !== 'object') return []
        const value = event as Partial<RecordedPadEvent>
        if (!value.key || !isPadKey(value.key) || typeof value.time !== 'number') return []
        return [{
          key: value.key,
          time: Math.max(0, value.time),
          pitch: clamp(Number(value.pitch) || 0, -12, 12),
          speed: clamp(Number(value.speed) || 1, 0.5, 2),
        }]
      })
      return [{
        id: candidate.id,
        name: candidate.name,
        duration: Math.max(0.5, Number(candidate.duration) || 0.5),
        layers: Math.max(1, Number(candidate.layers) || 1),
        events,
      }]
    })
  } catch {
    return []
  }
}

export const initSampler = (root: HTMLElement) => {
  const pads = new Map<PadKey, Pad>()
  const statusLabel = root.querySelector<HTMLElement>('#sampler-status-label')!
  const statusText = root.querySelector<HTMLElement>('#sampler-status-text')!
  const recordButton = root.querySelector<HTMLButtonElement>('#sampler-record-button')!
  const recordButtonLabel = recordButton.querySelector<HTMLElement>('.record-button-label')!
  const newRecordingButton = root.querySelector<HTMLButtonElement>('#sampler-new-recording')!
  const recordTarget = root.querySelector<HTMLElement>('#sampler-record-target')!
  const recordTime = root.querySelector<HTMLElement>('#sampler-record-time')!
  const recordingsElement = root.querySelector<HTMLElement>('#sampler-recordings')!
  const recordingCount = root.querySelector<HTMLElement>('#sampler-recording-count')!
  const editor = root.querySelector<HTMLElement>('#sampler-pad-editor')!
  const editorKey = root.querySelector<HTMLElement>('#sampler-edit-key')!
  const pitchValue = root.querySelector<HTMLElement>('#sampler-pitch-value')!
  const speedValue = root.querySelector<HTMLElement>('#sampler-speed-value')!
  const editorClose = root.querySelector<HTMLButtonElement>('#sampler-editor-close')!

  root.querySelectorAll<HTMLButtonElement>('[data-sampler-key]').forEach((button) => {
    const key = button.dataset.samplerKey?.toLowerCase()
    if (!key || !isPadKey(key)) return
    pads.set(key, {
      key,
      button,
      sourceLabel: button.querySelector<HTMLElement>('.sampler-pad-source')!,
      buffer: null,
      settings: { pitch: 0, speed: 1 },
    })
  })

  const audioContext = new AudioContext({ latencyHint: 'interactive' })
  const masterGain = audioContext.createGain()
  masterGain.gain.value = 0.88
  masterGain.connect(audioContext.destination)

  let active = false
  let recordings = loadStoredRecordings()
  let selectedRecordingId: string | null = null
  let playingRecordingId: string | null = null
  let loopState: LoopState | null = null
  let isRecording = false
  let recordStartedAt = 0
  let recordStartedAtPerformance = 0
  let recordTimer = 0
  let pendingEvents: RecordedPadEvent[] = []
  let editingKey: PadKey | null = null
  const activeInputs = new Map<string, PadKey>()
  const longPressTimers = new Map<string, number>()

  const setStatus = (label: string, text: string) => {
    statusLabel.textContent = label
    statusText.textContent = text
  }

  const saveRecordings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings))
    } catch {
      setStatus('STORAGE FULL', '녹음본을 브라우저에 저장하지 못했어요.')
    }
  }

  const resumeAudio = () => {
    if (audioContext.state !== 'running') void audioContext.resume()
  }

  const setPadLoaded = (pad: Pad, source: string) => {
    pad.button.classList.add('is-loaded')
    pad.button.classList.remove('is-missing')
    pad.sourceLabel.textContent = source
  }

  const loadPublicSample = async (pad: Pad) => {
    for (const extension of ['wav', 'mp3'] as const) {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}sampler/${pad.key}.${extension}`, { cache: 'no-cache' })
        const contentType = response.headers.get('content-type') ?? ''
        if (!response.ok || contentType.includes('text/html')) continue
        const encodedAudio = await response.arrayBuffer()
        pad.buffer = await audioContext.decodeAudioData(encodedAudio.slice(0))
        setPadLoaded(pad, extension.toUpperCase())
        return
      } catch {
        // Try the other supported extension.
      }
    }
    pad.button.classList.add('is-missing')
    pad.sourceLabel.textContent = 'EMPTY'
  }

  const playAudioBuffer = (pad: Pad, when = audioContext.currentTime, settings: PadSettings = pad.settings, loopSources?: Set<AudioBufferSourceNode>) => {
    if (!pad.buffer) return null
    const source = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    source.buffer = pad.buffer
    source.detune.value = settings.pitch * 100
    source.playbackRate.value = settings.speed
    source.connect(gain)
    gain.connect(masterGain)
    loopSources?.add(source)
    source.start(Math.max(when, audioContext.currentTime))
    source.addEventListener('ended', () => {
      loopSources?.delete(source)
      source.disconnect()
      gain.disconnect()
    }, { once: true })
    return source
  }

  const playLivePad = (pad: Pad) => {
    if (!pad.buffer) {
      setStatus('EMPTY PAD', `${pad.key.toUpperCase()} 키에 WAV 또는 MP3 파일을 넣어주세요.`)
      return
    }
    resumeAudio()
    playAudioBuffer(pad)
    if (isRecording) {
      const selected = recordings.find((recording) => recording.id === selectedRecordingId)
      let eventTime = Math.max(0, audioContext.currentTime - recordStartedAt)
      if (selected) eventTime %= selected.duration
      pendingEvents.push({ key: pad.key, time: eventTime, ...pad.settings })
    }
  }

  const stopLoop = () => {
    if (!loopState) return
    window.clearInterval(loopState.interval)
    loopState.sources.forEach((source) => {
      try { source.stop() } catch { /* Source already ended. */ }
    })
    loopState.sources.clear()
    loopState = null
    playingRecordingId = null
  }

  const scheduleLoopCycle = (recording: Recording, cycleAt: number, sources: Set<AudioBufferSourceNode>) => {
    recording.events.forEach((event) => {
      const pad = pads.get(event.key)
      if (pad) playAudioBuffer(pad, cycleAt + event.time, event, sources)
    })
  }

  const startLoop = (recording: Recording) => {
    stopLoop()
    resumeAudio()
    const sources = new Set<AudioBufferSourceNode>()
    const firstCycleAt = audioContext.currentTime + 0.045
    loopState = { recordingId: recording.id, nextCycleAt: firstCycleAt, interval: 0, sources }
    playingRecordingId = recording.id
    const scheduleAhead = () => {
      const currentLoop = loopState
      if (!currentLoop || currentLoop.recordingId !== recording.id) return
      while (currentLoop.nextCycleAt < audioContext.currentTime + 0.16) {
        scheduleLoopCycle(recording, currentLoop.nextCycleAt, sources)
        currentLoop.nextCycleAt += recording.duration
      }
    }
    scheduleAhead()
    loopState.interval = window.setInterval(scheduleAhead, 45)
  }

  const updateRecordTime = () => {
    const seconds = Math.max(0, (performance.now() - recordStartedAtPerformance) / 1000)
    const selected = recordings.find((recording) => recording.id === selectedRecordingId)
    recordTime.textContent = selected ? `${(seconds % selected.duration).toFixed(1)} / ${selected.duration.toFixed(1)}s` : `${seconds.toFixed(1)}s`
  }

  const renderRecordButton = () => {
    recordButton.classList.toggle('is-recording', isRecording)
    recordButton.classList.toggle('is-active', isRecording)
    recordButtonLabel.textContent = isRecording ? '녹음 완료 · SPACE' : '녹음 시작 · SPACE'
    newRecordingButton.disabled = isRecording
  }

  const formatDuration = (duration: number) => `${duration.toFixed(1)}s`

  const renderRecordings = () => {
    recordingsElement.replaceChildren()
    recordingCount.textContent = `${recordings.length} TRACK${recordings.length === 1 ? '' : 'S'}`
    if (recordings.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'recordings-empty'
      empty.textContent = '아직 녹음본이 없어요.'
      recordingsElement.append(empty)
      return
    }

    recordings.forEach((recording) => {
      const item = document.createElement('div')
      item.className = 'recording-item'
      item.classList.toggle('is-selected', selectedRecordingId === recording.id)
      item.classList.toggle('is-playing', playingRecordingId === recording.id)

      const selectButton = document.createElement('button')
      selectButton.type = 'button'
      selectButton.className = 'recording-select'
      const title = document.createElement('span')
      title.textContent = recording.name
      const meta = document.createElement('small')
      meta.textContent = `${formatDuration(recording.duration)} · ${recording.layers} LAYER`
      selectButton.append(title, meta)
      selectButton.addEventListener('click', () => {
        if (isRecording) return
        selectedRecordingId = recording.id
        recordTarget.textContent = recording.name
        setStatus('TRACK SELECTED', `${recording.name}을(를) 선택했어요. Space로 소리를 더 쌓아보세요.`)
        renderRecordings()
      })

      const loopButton = document.createElement('button')
      loopButton.type = 'button'
      loopButton.className = 'recording-loop'
      loopButton.setAttribute('aria-label', playingRecordingId === recording.id ? `${recording.name} 반복재생 중지` : `${recording.name} 반복재생`)
      const loopIcon = document.createElement('i')
      loopIcon.textContent = playingRecordingId === recording.id ? '■' : '▶'
      const loopText = document.createElement('span')
      loopText.textContent = playingRecordingId === recording.id ? '중지' : '반복'
      loopButton.append(loopIcon, loopText)
      loopButton.addEventListener('click', () => {
        if (isRecording) return
        if (playingRecordingId === recording.id) {
          stopLoop()
          setStatus('LOOP STOPPED', `${recording.name} 반복재생을 멈췄어요.`)
        } else {
          selectedRecordingId = recording.id
          recordTarget.textContent = recording.name
          startLoop(recording)
          setStatus('LOOPING', `${recording.name} 반복재생 중이에요.`)
        }
        renderRecordings()
      })
      item.append(selectButton, loopButton)
      recordingsElement.append(item)
    })
  }

  const startRecording = () => {
    resumeAudio()
    const selected = recordings.find((recording) => recording.id === selectedRecordingId)
    stopLoop()
    if (selected) startLoop(selected)
    isRecording = true
    pendingEvents = []
    recordStartedAt = selected && loopState ? loopState.nextCycleAt - selected.duration : audioContext.currentTime
    recordStartedAtPerformance = performance.now()
    recordTimer = window.setInterval(updateRecordTime, 80)
    recordTime.textContent = selected ? `0.0 / ${selected.duration.toFixed(1)}s` : '0.0s'
    setStatus(selected ? 'OVERDUBBING' : 'RECORDING', selected ? `${selected.name}을(를) 들으며 새 레이어를 녹음 중이에요.` : '패드 연주를 녹음하고 있어요.')
    renderRecordButton()
    renderRecordings()
  }

  const finishRecording = () => {
    window.clearInterval(recordTimer)
    const selected = recordings.find((recording) => recording.id === selectedRecordingId)
    const elapsed = Math.max(0.5, audioContext.currentTime - recordStartedAt)
    isRecording = false
    stopLoop()
    if (selected) {
      selected.events.push(...pendingEvents)
      selected.events.sort((a, b) => a.time - b.time)
      selected.layers += 1
      setStatus('LAYER SAVED', `${selected.name}에 ${selected.layers}번째 레이어를 쌓았어요.`)
      recordTarget.textContent = selected.name
      recordTime.textContent = formatDuration(selected.duration)
    } else {
      const recording: Recording = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `녹음 ${recordings.length + 1}`,
        duration: elapsed,
        layers: 1,
        events: pendingEvents,
      }
      recordings = [recording, ...recordings]
      selectedRecordingId = recording.id
      recordTarget.textContent = recording.name
      recordTime.textContent = formatDuration(recording.duration)
      setStatus('RECORDING SAVED', `${recording.name}을(를) 저장했어요.`)
    }
    pendingEvents = []
    saveRecordings()
    renderRecordButton()
    renderRecordings()
  }

  const toggleRecording = () => {
    if (!active) return
    if (isRecording) finishRecording()
    else startRecording()
  }

  const updatePressedVisual = (key: PadKey) => {
    const pressed = Array.from(activeInputs.values()).includes(key)
    const pad = pads.get(key)
    pad?.button.classList.toggle('is-pressed', pressed)
    pad?.button.setAttribute('aria-pressed', String(pressed))
  }

  const renderEditor = () => {
    pads.forEach((pad) => pad.button.classList.toggle('is-editing', pad.key === editingKey))
    if (!editingKey) {
      editor.hidden = true
      return
    }
    const settings = pads.get(editingKey)!.settings
    editor.hidden = false
    editorKey.textContent = editingKey.toUpperCase()
    pitchValue.textContent = `${settings.pitch > 0 ? '+' : ''}${settings.pitch} st`
    speedValue.textContent = `${settings.speed.toFixed(1)}×`
  }

  const openEditor = (key: PadKey) => {
    editingKey = key
    renderEditor()
    setStatus('PAD EDIT', `${key.toUpperCase()} 패드의 피치와 속도를 조절할 수 있어요.`)
  }

  const beginPadInput = (inputId: string, key: PadKey) => {
    if (!active || activeInputs.has(inputId)) return
    activeInputs.set(inputId, key)
    updatePressedVisual(key)
    playLivePad(pads.get(key)!)
    const timer = window.setTimeout(() => {
      longPressTimers.delete(inputId)
      if (activeInputs.get(inputId) === key) openEditor(key)
    }, 560)
    longPressTimers.set(inputId, timer)
  }

  const endPadInput = (inputId: string) => {
    const key = activeInputs.get(inputId)
    if (!key) return
    const timer = longPressTimers.get(inputId)
    if (timer) window.clearTimeout(timer)
    longPressTimers.delete(inputId)
    activeInputs.delete(inputId)
    updatePressedVisual(key)
  }

  const adjustEditingPad = (type: string) => {
    if (!editingKey) return
    const pad = pads.get(editingKey)!
    if (type === 'pitch-down') pad.settings.pitch = clamp(pad.settings.pitch - 1, -12, 12)
    if (type === 'pitch-up') pad.settings.pitch = clamp(pad.settings.pitch + 1, -12, 12)
    if (type === 'speed-down') pad.settings.speed = clamp(Number((pad.settings.speed - 0.1).toFixed(1)), 0.5, 2)
    if (type === 'speed-up') pad.settings.speed = clamp(Number((pad.settings.speed + 0.1).toFixed(1)), 0.5, 2)
    renderEditor()
    resumeAudio()
    playAudioBuffer(pad)
  }

  root.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => adjustEditingPad(button.dataset.edit ?? ''))
  })
  editorClose.addEventListener('click', () => {
    editingKey = null
    renderEditor()
  })

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) return
    if (event.code === 'Space') {
      event.preventDefault()
      if (!event.repeat) toggleRecording()
      return
    }
    const key = event.key.toLowerCase()
    if (!isPadKey(key)) return
    event.preventDefault()
    if (!event.repeat) beginPadInput(`key:${key}`, key)
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (isPadKey(key)) endPadInput(`key:${key}`)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', () => Array.from(activeInputs.keys()).forEach(endPadInput))

  pads.forEach((pad) => {
    pad.button.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      pad.button.setPointerCapture(event.pointerId)
      beginPadInput(`pointer:${event.pointerId}`, pad.key)
    })
    pad.button.addEventListener('pointerup', (event) => {
      if (pad.button.hasPointerCapture(event.pointerId)) pad.button.releasePointerCapture(event.pointerId)
      endPadInput(`pointer:${event.pointerId}`)
    })
    pad.button.addEventListener('pointercancel', (event) => endPadInput(`pointer:${event.pointerId}`))
  })

  recordButton.addEventListener('click', toggleRecording)
  newRecordingButton.addEventListener('click', () => {
    if (isRecording) return
    stopLoop()
    selectedRecordingId = null
    recordTarget.textContent = '새 녹음'
    recordTime.textContent = '0.0s'
    setStatus('NEW RECORDING', 'Space를 누르면 새로운 녹음이 시작돼요.')
    renderRecordings()
  })

  renderRecordButton()
  renderRecordings()
  renderEditor()
  void Promise.all(Array.from(pads.values(), loadPublicSample)).then(() => {
    const loadedCount = Array.from(pads.values()).filter((pad) => pad.buffer).length
    setStatus('READY', `${loadedCount}개의 샘플이 준비됐어요. Space로 연주 녹음을 시작하세요.`)
  })

  return {
    setActive(nextActive: boolean) {
      active = nextActive
      Array.from(activeInputs.keys()).forEach(endPadInput)
      if (active) resumeAudio()
      else {
        if (isRecording) finishRecording()
        stopLoop()
      }
    },
  }
}
