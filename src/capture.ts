import html2canvas from 'html2canvas'

type CaptureKind = 'photo' | 'video'

type CaptureElements = {
  control: HTMLElement
  button: HTMLButtonElement
  timer: HTMLElement
  toast: HTMLElement
  result: HTMLElement
  resultMedia: HTMLElement
  resultTitle: HTMLElement
  download: HTMLAnchorElement
  share: HTMLButtonElement
  close: HTMLButtonElement
}

const HOLD_DELAY = 620
const RECORD_FPS = 20
const MIN_RECORDING_MS = 350
const MAX_RECORDING_MS = 3 * 60 * 1000

const pad = (value: number) => String(value).padStart(2, '0')
const makeStamp = () => {
  const date = new Date()
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

const downloadExtension = (mimeType: string) => mimeType.includes('mp4') ? 'mp4' : 'webm'

const chooseVideoMimeType = () => {
  if (!('MediaRecorder' in window) || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas encoding failed.')), type)
})

export const initGlobalCapture = () => {
  const elements: CaptureElements = {
    control: document.querySelector<HTMLElement>('.global-capture')!,
    button: document.querySelector<HTMLButtonElement>('#global-capture-button')!,
    timer: document.querySelector<HTMLElement>('#capture-timer')!,
    toast: document.querySelector<HTMLElement>('#capture-toast')!,
    result: document.querySelector<HTMLElement>('.capture-result')!,
    resultMedia: document.querySelector<HTMLElement>('.capture-result-media')!,
    resultTitle: document.querySelector<HTMLElement>('#capture-result-title')!,
    download: document.querySelector<HTMLAnchorElement>('#capture-download')!,
    share: document.querySelector<HTMLButtonElement>('#capture-share')!,
    close: document.querySelector<HTMLButtonElement>('#capture-close')!,
  }

  const captureCanvas = document.createElement('canvas')
  const captureContext = captureCanvas.getContext('2d', { alpha: false })!
  let holdTimer = 0
  let holdTriggered = false
  let pointerDown = false
  let recorder: MediaRecorder | null = null
  let recordingStarting = false
  let recorderStream: MediaStream | null = null
  let recordingFrame = 0
  let recordingStartedAt = 0
  let scheduledStop = 0
  let timerInterval = 0
  let chunks: Blob[] = []
  let renderBusy = false
  let resultUrl: string | null = null
  let resultBlob: Blob | null = null
  let resultFileName = ''

  const setToast = (message: string, duration = 2200) => {
    elements.toast.textContent = message
    elements.toast.classList.add('is-visible')
    window.setTimeout(() => elements.toast.classList.remove('is-visible'), duration)
  }

  const activeView = () => document.querySelector<HTMLElement>('.view.is-active')

  const sizeCaptureCanvas = () => {
    const width = Math.max(320, window.innerWidth)
    const height = Math.max(320, window.innerHeight)
    if (captureCanvas.width !== width || captureCanvas.height !== height) {
      captureCanvas.width = width
      captureCanvas.height = height
    }
    return { width, height }
  }

  const drawVideoCover = (video: HTMLVideoElement, width: number, height: number) => {
    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const targetRatio = width / height
    const sourceRatio = sourceWidth / sourceHeight
    let sourceX = 0
    let sourceY = 0
    let cropWidth = sourceWidth
    let cropHeight = sourceHeight
    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio
      sourceX = (sourceWidth - cropWidth) / 2
    } else {
      cropHeight = sourceWidth / targetRatio
      sourceY = (sourceHeight - cropHeight) / 2
    }
    captureContext.save()
    captureContext.translate(width, 0)
    captureContext.scale(-1, 1)
    captureContext.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height)
    captureContext.restore()
  }

  const drawLemonadeFrame = (view: HTMLElement, width: number, height: number) => {
    const video = view.querySelector<HTMLVideoElement>('#lemonade-camera')
    const overlay = view.querySelector<HTMLCanvasElement>('#lemonade-canvas')
    if (!video || !overlay || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false
    captureContext.fillStyle = '#161a12'
    captureContext.fillRect(0, 0, width, height)
    drawVideoCover(video, width, height)
    captureContext.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, width, height)
    captureContext.fillStyle = '#fff44e'
    captureContext.font = '800 28px Nunito, sans-serif'
    captureContext.fillText('Lemonade.', 22, 42)
    return true
  }

  const drawBalloonFrame = (view: HTMLElement, width: number, height: number) => {
    const video = view.querySelector<HTMLVideoElement>('#balloon-camera')
    const overlay = view.querySelector<HTMLCanvasElement>('#balloon-canvas')
    if (!video || !overlay || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false
    captureContext.fillStyle = '#17141d'
    captureContext.fillRect(0, 0, width, height)
    drawVideoCover(video, width, height)
    captureContext.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, width, height)
    captureContext.fillStyle = '#ffe064'
    captureContext.font = '800 28px Nunito, sans-serif'
    captureContext.fillText('Balloon.', 22, 42)
    return true
  }

  const drawCurrentFrame = async () => {
    const view = activeView()
    if (!view) throw new Error('No active view to capture.')
    const { width, height } = sizeCaptureCanvas()
    if (view.id === 'juice-view' && drawLemonadeFrame(view, width, height)) return
    if (view.id === 'balloon-view' && drawBalloonFrame(view, width, height)) return

    const snapshot = await html2canvas(view, {
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: null,
      imageTimeout: 5000,
      ignoreElements: (node) => node instanceof HTMLElement && (
        node.classList.contains('global-capture')
        || node.classList.contains('capture-result')
        || node.id === 'capture-toast'
      ),
    })
    captureContext.fillStyle = getComputedStyle(view).backgroundColor || '#000'
    captureContext.fillRect(0, 0, width, height)
    captureContext.drawImage(snapshot, 0, 0, width, height)
  }

  const clearResult = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    resultUrl = null
    resultBlob = null
    resultFileName = ''
    elements.resultMedia.replaceChildren()
    elements.result.hidden = true
  }

  const showResult = (blob: Blob, kind: CaptureKind, fileName: string) => {
    clearResult()
    resultBlob = blob
    resultFileName = fileName
    resultUrl = URL.createObjectURL(blob)
    const media = document.createElement(kind === 'photo' ? 'img' : 'video')
    media.src = resultUrl
    if (media instanceof HTMLVideoElement) {
      media.controls = true
      media.playsInline = true
      media.loop = true
    }
    elements.resultMedia.append(media)
    elements.resultTitle.textContent = kind === 'photo' ? '사진이 촬영됐어요' : '영상 촬영이 완료됐어요'
    elements.download.href = resultUrl
    elements.download.download = fileName
    elements.share.hidden = !(typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] }))
    elements.result.hidden = false
    media.addEventListener('loadeddata', () => {
      if (media instanceof HTMLVideoElement) void media.play().catch(() => {})
    }, { once: true })
  }

  const takePhoto = async () => {
    if (recorder) return
    elements.button.classList.add('is-capturing')
    elements.button.disabled = true
    try {
      await drawCurrentFrame()
      const blob = await canvasToBlob(captureCanvas)
      showResult(blob, 'photo', `interactive-${makeStamp()}.png`)
      setToast('사진 촬영 완료')
    } catch (error) {
      console.error('사진 촬영에 실패했습니다.', error)
      setToast('사진을 촬영하지 못했어요')
    } finally {
      elements.button.classList.remove('is-capturing')
      elements.button.disabled = false
    }
  }

  const updateRecordingTime = () => {
    const elapsed = Date.now() - recordingStartedAt
    const totalSeconds = Math.floor(elapsed / 1000)
    elements.timer.textContent = `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`
    if (elapsed >= MAX_RECORDING_MS) stopRecording()
  }

  const renderRecordingFrame = async () => {
    if (!recorder || recorder.state !== 'recording') return
    if (!renderBusy) {
      renderBusy = true
      try {
        await drawCurrentFrame()
      } catch (error) {
        console.warn('녹화 프레임을 그리지 못했습니다.', error)
      } finally {
        renderBusy = false
      }
    }
    recordingFrame = requestAnimationFrame(renderRecordingFrame)
  }

  const finishRecording = (mimeType: string) => {
    cancelAnimationFrame(recordingFrame)
    window.clearTimeout(scheduledStop)
    scheduledStop = 0
    window.clearInterval(timerInterval)
    recorderStream?.getTracks().forEach((track) => track.stop())
    const blob = new Blob(chunks, { type: mimeType || chunks[0]?.type || 'video/webm' })
    const extension = downloadExtension(blob.type)
    recorder = null
    recorderStream = null
    chunks = []
    elements.control.classList.remove('is-recording')
    elements.button.disabled = false
    elements.button.setAttribute('aria-pressed', 'false')
    elements.button.setAttribute('aria-label', '촬영 버튼: 짧게 사진, 길게 영상')
    elements.timer.textContent = '00:00'
    if (blob.size > 0) {
      showResult(blob, 'video', `interactive-${makeStamp()}.${extension}`)
      setToast('영상 촬영 완료')
    } else {
      setToast('저장할 영상 데이터가 없어요')
    }
  }

  const startRecording = async () => {
    if (recorder || recordingStarting) return
    if (!('MediaRecorder' in window) || !('captureStream' in captureCanvas)) {
      setToast('이 브라우저에서는 영상 촬영을 지원하지 않아요', 3200)
      return
    }
    recordingStarting = true
    elements.control.classList.add('is-recording')
    elements.button.setAttribute('aria-pressed', 'true')
    elements.button.disabled = true
    elements.button.setAttribute('aria-label', '영상 촬영 준비 중')
    setToast('영상 촬영 준비 중…')
    try {
      await drawCurrentFrame()
      recorderStream = captureCanvas.captureStream(RECORD_FPS)
      const mimeType = chooseVideoMimeType()
      recorder = mimeType
        ? new MediaRecorder(recorderStream, { mimeType, videoBitsPerSecond: 5_000_000 })
        : new MediaRecorder(recorderStream, { videoBitsPerSecond: 5_000_000 })
      chunks = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) chunks.push(event.data)
      })
      recorder.addEventListener('stop', () => finishRecording(recorder?.mimeType || mimeType), { once: true })
      recorder.addEventListener('error', () => {
        setToast('영상 녹화 중 오류가 발생했어요')
        if (recorder?.state !== 'inactive') recorder?.stop()
      })
      recorder.start(250)
      recordingStartedAt = Date.now()
      elements.button.setAttribute('aria-label', '영상 촬영 종료')
      elements.timer.textContent = '00:00'
      timerInterval = window.setInterval(updateRecordingTime, 250)
      recordingFrame = requestAnimationFrame(renderRecordingFrame)
      setToast('영상 촬영 시작')
    } catch (error) {
      console.error('영상 촬영을 시작하지 못했습니다.', error)
      recorderStream?.getTracks().forEach((track) => track.stop())
      recorderStream = null
      recorder = null
      elements.control.classList.remove('is-recording')
      elements.button.setAttribute('aria-pressed', 'false')
      setToast('영상 촬영을 시작하지 못했어요')
    } finally {
      recordingStarting = false
      elements.button.disabled = false
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return
    const remaining = MIN_RECORDING_MS - (Date.now() - recordingStartedAt)
    if (remaining > 0) {
      if (!scheduledStop) {
        elements.button.disabled = true
        elements.button.setAttribute('aria-label', '영상 촬영 종료 중')
        scheduledStop = window.setTimeout(() => {
          scheduledStop = 0
          stopRecording()
        }, remaining)
      }
      return
    }
    recorder.requestData()
    recorder.stop()
  }

  const beginPress = (event: PointerEvent) => {
    if (event.button !== 0 || elements.button.disabled) return
    event.preventDefault()
    pointerDown = true
    holdTriggered = false
    elements.button.setPointerCapture(event.pointerId)
    if (recorder) return
    elements.control.classList.add('is-pressing')
    holdTimer = window.setTimeout(() => {
      if (!pointerDown) return
      holdTriggered = true
      elements.control.classList.remove('is-pressing')
      void startRecording()
    }, HOLD_DELAY)
  }

  const endPress = (event: PointerEvent) => {
    if (!pointerDown) return
    event.preventDefault()
    pointerDown = false
    window.clearTimeout(holdTimer)
    elements.control.classList.remove('is-pressing')
    if (elements.button.hasPointerCapture(event.pointerId)) elements.button.releasePointerCapture(event.pointerId)
    if (recorder && !holdTriggered) {
      stopRecording()
      return
    }
    if (!holdTriggered) void takePhoto()
  }

  elements.button.addEventListener('pointerdown', beginPress)
  elements.button.addEventListener('pointerup', endPress)
  elements.button.addEventListener('contextmenu', (event) => event.preventDefault())
  elements.button.addEventListener('pointercancel', (event) => {
    pointerDown = false
    window.clearTimeout(holdTimer)
    elements.control.classList.remove('is-pressing')
    if (elements.button.hasPointerCapture(event.pointerId)) elements.button.releasePointerCapture(event.pointerId)
  })
  elements.button.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key) || event.repeat) return
    event.preventDefault()
    if (recorder) stopRecording()
    else void takePhoto()
  })
  elements.close.addEventListener('click', clearResult)
  elements.result.addEventListener('click', (event) => {
    if (event.target === elements.result) clearResult()
  })
  elements.share.addEventListener('click', async () => {
    if (!resultBlob || !resultFileName || !navigator.share) return
    try {
      await navigator.share({
        title: 'Interactive capture',
        files: [new File([resultBlob], resultFileName, { type: resultBlob.type })],
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setToast('공유할 수 없어요. 저장 버튼을 이용해 주세요.')
    }
  })

  return {
    stopRecording,
  }
}
