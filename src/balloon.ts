import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

type Point = { x: number; y: number }

type TrackedHand = {
  key: string
  index: Point
  thumb: Point
  pinch: Point
  pinchVelocity: Point
  isPinching: boolean
  lastSeen: number
}

type Balloon = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rx: number
  ry: number
  ropeLength: number
  riseSpeed: number
  phase: number
  rotation: number
  color: string
  lightColor: string
  darkColor: string
  holderKey: string | null
}

type Fragment = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  life: number
  maxLife: number
  color: string
  kind: 'shard' | 'spark'
}

type BurstRing = {
  x: number
  y: number
  radius: number
  life: number
  maxLife: number
  color: string
}

const BASE_URL = import.meta.env.BASE_URL
const TAU = Math.PI * 2
const MAX_BALLOONS = 14
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const randomBetween = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum)

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared < 0.0001) return Math.hypot(point.x - start.x, point.y - start.y)
  const amount = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1)
  return Math.hypot(point.x - (start.x + dx * amount), point.y - (start.y + dy * amount))
}

export const initBalloon = (root: HTMLElement) => {
  const video = root.querySelector<HTMLVideoElement>('#balloon-camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#balloon-canvas')!
  const context = canvas.getContext('2d')!
  const startPanel = root.querySelector<HTMLElement>('.balloon-start')!
  const startMessage = root.querySelector<HTMLElement>('#balloon-start-message')!
  const startButton = root.querySelector<HTMLButtonElement>('#balloon-start-button')!
  const statusLabel = root.querySelector<HTMLElement>('#balloon-status-label')!
  const statusText = root.querySelector<HTMLElement>('#balloon-status-text')!
  const countElement = root.querySelector<HTMLElement>('#balloon-count')!
  const poppedElement = root.querySelector<HTMLElement>('#balloon-popped')!

  let active = false
  let starting = false
  let stream: MediaStream | null = null
  let handLandmarker: HandLandmarker | null = null
  let handLandmarkerPromise: Promise<HandLandmarker> | null = null
  let latestResult: HandLandmarkerResult | null = null
  let animationFrame = 0
  let lastVideoTime = -1
  let previousFrameTime = 0
  let width = 1
  let height = 1
  let nextBalloonId = 0
  let nextSpawnAt = 0
  let poppedCount = 0
  let balloons: Balloon[] = []
  let fragments: Fragment[] = []
  let burstRings: BurstRing[] = []
  let audioContext: AudioContext | null = null
  const hands = new Map<string, TrackedHand>()

  const setStatus = (label: string, text: string) => {
    statusLabel.textContent = label
    statusText.textContent = text
  }

  const updateScore = () => {
    countElement.textContent = String(balloons.length)
    poppedElement.textContent = String(poppedCount)
  }

  const resizeCanvas = () => {
    const nextWidth = Math.max(1, root.clientWidth)
    const nextHeight = Math.max(1, root.clientHeight)
    if (nextWidth === width && nextHeight === height) return
    const scaleX = width > 1 ? nextWidth / width : 1
    const scaleY = height > 1 ? nextHeight / height : 1
    balloons.forEach((balloon) => {
      balloon.x *= scaleX
      balloon.y *= scaleY
    })
    fragments.forEach((fragment) => {
      fragment.x *= scaleX
      fragment.y *= scaleY
    })
    width = nextWidth
    height = nextHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  const balloonKnot = (balloon: Balloon): Point => {
    if (balloon.holderKey) {
      const holder = hands.get(balloon.holderKey)
      if (holder) {
        const dx = holder.pinch.x - balloon.x
        const dy = holder.pinch.y - balloon.y
        const distance = Math.max(Math.hypot(dx, dy), 0.001)
        return {
          x: balloon.x + dx / distance * balloon.ry,
          y: balloon.y + dy / distance * balloon.ry,
        }
      }
    }
    return {
      x: balloon.x - Math.sin(balloon.rotation) * balloon.ry,
      y: balloon.y + Math.cos(balloon.rotation) * balloon.ry,
    }
  }

  const ropeEnd = (balloon: Balloon, knot = balloonKnot(balloon)): Point => {
    const holder = balloon.holderKey ? hands.get(balloon.holderKey) : null
    if (holder) return holder.pinch
    const angle = balloon.rotation * 0.35 + Math.sin(balloon.phase) * 0.055
    return {
      x: knot.x + Math.sin(angle) * balloon.ropeLength,
      y: knot.y + Math.cos(angle) * balloon.ropeLength,
    }
  }

  const spawnBalloon = (initialY?: number) => {
    if (balloons.length >= MAX_BALLOONS) return
    const scale = clamp(Math.min(width / 920, height / 760), 0.72, 1.25)
    const rx = randomBetween(27, 53) * scale
    const hue = Math.floor(randomBetween(0, 360))
    const saturation = Math.floor(randomBetween(72, 91))
    const lightness = Math.floor(randomBetween(53, 66))
    const x = randomBetween(rx + 10, Math.max(rx + 11, width - rx - 10))
    balloons.push({
      id: nextBalloonId++,
      x,
      y: initialY ?? height + rx * 1.7 + randomBetween(20, 120),
      vx: randomBetween(-8, 8),
      vy: -randomBetween(20, 36),
      rx,
      ry: rx * randomBetween(1.17, 1.34),
      ropeLength: randomBetween(82, 145) * scale,
      riseSpeed: randomBetween(21, 39) * scale,
      phase: randomBetween(0, TAU),
      rotation: randomBetween(-0.1, 0.1),
      color: `hsl(${hue} ${saturation}% ${lightness}%)`,
      lightColor: `hsl(${hue} ${Math.min(100, saturation + 5)}% ${Math.min(83, lightness + 20)}%)`,
      darkColor: `hsl(${hue} ${saturation}% ${Math.max(25, lightness - 23)}%)`,
      holderKey: null,
    })
    updateScore()
  }

  const resetScene = () => {
    resizeCanvas()
    balloons = []
    fragments = []
    burstRings = []
    poppedCount = 0
    nextBalloonId = 0
    const initialCount = clamp(Math.round(width / 170), 5, 9)
    for (let index = 0; index < initialCount; index += 1) {
      spawnBalloon(height + randomBetween(-height * 0.75, 110))
    }
    nextSpawnAt = performance.now() + 650
    updateScore()
  }

  const createTracker = async () => {
    if (handLandmarker) return handLandmarker
    if (handLandmarkerPromise) return handLandmarkerPromise
    handLandmarkerPromise = (async () => {
      setStatus('LOADING AI', '손가락과 핀치 제스처를 인식하고 있어요.')
      const vision = await FilesetResolver.forVisionTasks(`${BASE_URL}mediapipe/wasm`)
      const options = {
        runningMode: 'VIDEO' as const,
        numHands: 2,
        minHandDetectionConfidence: 0.52,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }
      try {
        return await HandLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { modelAssetPath: `${BASE_URL}mediapipe/hand_landmarker.task`, delegate: 'GPU' },
        })
      } catch {
        return HandLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { modelAssetPath: `${BASE_URL}mediapipe/hand_landmarker.task`, delegate: 'CPU' },
        })
      }
    })()
    try {
      handLandmarker = await handLandmarkerPromise
      return handLandmarker
    } finally {
      handLandmarkerPromise = null
    }
  }

  const landmarkToScreen = (landmark: NormalizedLandmark): Point => {
    const screenAspect = width / Math.max(height, 1)
    const videoAspect = Math.max(video.videoWidth, 1) / Math.max(video.videoHeight, 1)
    let normalizedX = landmark.x
    let normalizedY = landmark.y
    if (videoAspect > screenAspect) {
      const visibleWidth = screenAspect / videoAspect
      normalizedX = (landmark.x - (1 - visibleWidth) / 2) / visibleWidth
    } else {
      const visibleHeight = videoAspect / screenAspect
      normalizedY = (landmark.y - (1 - visibleHeight) / 2) / visibleHeight
    }
    return {
      x: clamp(1 - normalizedX, -0.1, 1.1) * width,
      y: clamp(normalizedY, -0.1, 1.1) * height,
    }
  }

  const updateHands = (result: HandLandmarkerResult, now: number) => {
    const seen = new Set<string>()
    result.landmarks.forEach((landmarks, handIndex) => {
      const key = result.handedness[handIndex]?.[0]?.categoryName ?? `Hand${handIndex}`
      seen.add(key)
      const index = landmarkToScreen(landmarks[8])
      const thumb = landmarkToScreen(landmarks[4])
      const previous = hands.get(key)
      const rawDistance = (first: number, second: number) => Math.hypot(
        landmarks[first].x - landmarks[second].x,
        landmarks[first].y - landmarks[second].y,
      )
      const palmWidth = Math.max(rawDistance(5, 17), 0.001)
      const pinchRatio = rawDistance(4, 8) / palmWidth
      const isPinching = pinchRatio < (previous?.isPinching ? 0.9 : 0.66)
      const smoothing = previous ? 0.68 : 1
      const smoothIndex = previous ? {
        x: previous.index.x + (index.x - previous.index.x) * smoothing,
        y: previous.index.y + (index.y - previous.index.y) * smoothing,
      } : index
      const smoothThumb = previous ? {
        x: previous.thumb.x + (thumb.x - previous.thumb.x) * smoothing,
        y: previous.thumb.y + (thumb.y - previous.thumb.y) * smoothing,
      } : thumb
      const pinch = {
        x: (smoothIndex.x + smoothThumb.x) / 2,
        y: (smoothIndex.y + smoothThumb.y) / 2,
      }
      const elapsed = Math.max((now - (previous?.lastSeen ?? now - 16)) / 1000, 1 / 120)
      const rawVelocity = previous ? {
        x: (pinch.x - previous.pinch.x) / elapsed,
        y: (pinch.y - previous.pinch.y) / elapsed,
      } : { x: 0, y: 0 }
      hands.set(key, {
        key,
        index: smoothIndex,
        thumb: smoothThumb,
        pinch,
        pinchVelocity: previous ? {
          x: previous.pinchVelocity.x + (rawVelocity.x - previous.pinchVelocity.x) * 0.42,
          y: previous.pinchVelocity.y + (rawVelocity.y - previous.pinchVelocity.y) * 0.42,
        } : rawVelocity,
        isPinching,
        lastSeen: now,
      })
    })
    hands.forEach((hand, key) => {
      if (!seen.has(key) && now - hand.lastSeen > 190) hands.delete(key)
    })
  }

  const tryGrabRopes = () => {
    const occupiedHands = new Set(balloons.map((balloon) => balloon.holderKey).filter(Boolean))
    hands.forEach((hand) => {
      if (!hand.isPinching || occupiedHands.has(hand.key)) return
      const candidate = balloons
        .filter((balloon) => !balloon.holderKey)
        .map((balloon) => {
          const knot = balloonKnot(balloon)
          return { balloon, distance: distanceToSegment(hand.pinch, knot, ropeEnd(balloon, knot)) }
        })
        .filter(({ balloon, distance }) => distance < Math.max(18, balloon.rx * 0.38))
        .sort((first, second) => first.distance - second.distance)[0]
      if (!candidate) return
      candidate.balloon.holderKey = hand.key
      occupiedHands.add(hand.key)
    })
  }

  const playPop = (x: number, size: number) => {
    try {
      audioContext ??= new AudioContext()
      if (audioContext.state === 'suspended') void audioContext.resume()
      const duration = 0.12
      const sampleRate = audioContext.sampleRate
      const buffer = audioContext.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate)
      const data = buffer.getChannelData(0)
      for (let index = 0; index < data.length; index += 1) {
        const progress = index / data.length
        data[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 3.2)
      }
      const noise = audioContext.createBufferSource()
      const gain = audioContext.createGain()
      const filter = audioContext.createBiquadFilter()
      const pan = audioContext.createStereoPanner()
      noise.buffer = buffer
      filter.type = 'highpass'
      filter.frequency.value = 420
      gain.gain.value = clamp(0.18 + size / 360, 0.18, 0.38)
      pan.pan.value = clamp(x / width * 2 - 1, -0.8, 0.8)
      noise.connect(filter).connect(gain).connect(pan).connect(audioContext.destination)
      noise.start()
    } catch {
      // The visual interaction remains available when Web Audio is blocked.
    }
  }

  const prepareAudio = () => {
    try {
      audioContext ??= new AudioContext()
      return audioContext.state === 'suspended'
        ? audioContext.resume().catch(() => undefined)
        : Promise.resolve()
    } catch {
      return Promise.resolve()
    }
  }

  const popBalloon = (balloon: Balloon) => {
    const fragmentCount = Math.round(14 + balloon.rx * 0.14)
    for (let index = 0; index < fragmentCount; index += 1) {
      const angle = index / fragmentCount * TAU + randomBetween(-0.18, 0.18)
      const speed = randomBetween(125, 330) + balloon.rx * 1.4
      const life = randomBetween(0.55, 0.95)
      fragments.push({
        x: balloon.x + Math.cos(angle) * balloon.rx * 0.25,
        y: balloon.y + Math.sin(angle) * balloon.ry * 0.2,
        vx: Math.cos(angle) * speed + balloon.vx * 0.25,
        vy: Math.sin(angle) * speed + balloon.vy * 0.25,
        size: randomBetween(balloon.rx * 0.1, balloon.rx * 0.28),
        rotation: randomBetween(0, TAU),
        spin: randomBetween(-12, 12),
        life,
        maxLife: life,
        color: index % 3 === 0 ? balloon.lightColor : index % 3 === 1 ? balloon.color : balloon.darkColor,
        kind: 'shard',
      })
    }
    for (let index = 0; index < 12; index += 1) {
      const angle = randomBetween(0, TAU)
      const speed = randomBetween(80, 260)
      const life = randomBetween(0.28, 0.6)
      fragments.push({
        x: balloon.x,
        y: balloon.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomBetween(1.5, 4),
        rotation: 0,
        spin: 0,
        life,
        maxLife: life,
        color: balloon.lightColor,
        kind: 'spark',
      })
    }
    burstRings.push({ x: balloon.x, y: balloon.y, radius: balloon.rx * 0.4, life: 0.34, maxLife: 0.34, color: balloon.lightColor })
    playPop(balloon.x, balloon.rx)
    poppedCount += 1
    balloons = balloons.filter((candidate) => candidate.id !== balloon.id)
    updateScore()
  }

  const checkIndexCollisions = () => {
    const visibleHands = Array.from(hands.values())
    for (const balloon of [...balloons]) {
      const cosine = Math.cos(-balloon.rotation)
      const sine = Math.sin(-balloon.rotation)
      const touched = visibleHands.some((hand) => {
        const dx = hand.index.x - balloon.x
        const dy = hand.index.y - balloon.y
        const localX = dx * cosine - dy * sine
        const localY = dx * sine + dy * cosine
        return (localX * localX) / (balloon.rx * balloon.rx) + (localY * localY) / (balloon.ry * balloon.ry) <= 1.08
      })
      if (touched) popBalloon(balloon)
    }
  }

  const updateBalloons = (time: number, delta: number) => {
    balloons.forEach((balloon) => {
      const holder = balloon.holderKey ? hands.get(balloon.holderKey) : null
      if (balloon.holderKey && (!holder || !holder.isPinching)) {
        if (holder) {
          balloon.vx += holder.pinchVelocity.x * 0.16
          balloon.vy += holder.pinchVelocity.y * 0.16
        }
        balloon.holderKey = null
      }

      if (holder?.isPinching && balloon.holderKey) {
        const oldX = balloon.x
        const oldY = balloon.y
        balloon.vx += Math.sin(time * 0.0012 + balloon.phase) * 18 * delta
        balloon.vy -= 128 * delta
        balloon.vx *= Math.pow(0.8, delta)
        balloon.vy *= Math.pow(0.84, delta)
        balloon.x += balloon.vx * delta
        balloon.y += balloon.vy * delta
        let dx = balloon.x - holder.pinch.x
        let dy = balloon.y - holder.pinch.y
        let distance = Math.hypot(dx, dy)
        if (distance < 0.001) {
          dx = 0
          dy = -1
          distance = 1
        }
        const constrainedDistance = balloon.ropeLength + balloon.ry
        balloon.x = holder.pinch.x + dx / distance * constrainedDistance
        balloon.y = holder.pinch.y + dy / distance * constrainedDistance
        balloon.vx = clamp((balloon.x - oldX) / Math.max(delta, 1 / 120), -1300, 1300) * 0.985
        balloon.vy = clamp((balloon.y - oldY) / Math.max(delta, 1 / 120), -1300, 1300) * 0.985
        const ropeDirection = Math.atan2(holder.pinch.y - balloon.y, holder.pinch.x - balloon.x)
        balloon.rotation = ropeDirection - Math.PI / 2
      } else {
        balloon.phase += delta * (0.75 + balloon.riseSpeed * 0.008)
        const targetVx = Math.sin(balloon.phase) * (7 + balloon.rx * 0.12)
        balloon.vx += (targetVx - balloon.vx) * Math.min(1, delta * 0.85)
        balloon.vy += (-balloon.riseSpeed - balloon.vy) * Math.min(1, delta * 0.7)
        balloon.x += balloon.vx * delta
        balloon.y += balloon.vy * delta
        balloon.rotation += (Math.sin(balloon.phase * 0.82) * 0.12 - balloon.rotation) * Math.min(1, delta * 1.4)
        if (balloon.x < balloon.rx) {
          balloon.x = balloon.rx
          balloon.vx = Math.abs(balloon.vx)
        } else if (balloon.x > width - balloon.rx) {
          balloon.x = width - balloon.rx
          balloon.vx = -Math.abs(balloon.vx)
        }
      }
    })
    balloons = balloons.filter((balloon) => balloon.holderKey || balloon.y + balloon.ry + balloon.ropeLength > -60)
    if (time >= nextSpawnAt && balloons.length < MAX_BALLOONS) {
      spawnBalloon()
      nextSpawnAt = time + randomBetween(620, 1250)
    }
  }

  const updateFragments = (delta: number) => {
    fragments.forEach((fragment) => {
      fragment.vy += 235 * delta
      fragment.x += fragment.vx * delta
      fragment.y += fragment.vy * delta
      fragment.vx *= Math.pow(0.32, delta)
      fragment.rotation += fragment.spin * delta
      fragment.life -= delta
    })
    fragments = fragments.filter((fragment) => fragment.life > 0)
    burstRings.forEach((ring) => {
      ring.radius += 240 * delta
      ring.life -= delta
    })
    burstRings = burstRings.filter((ring) => ring.life > 0)
  }

  const drawRope = (balloon: Balloon) => {
    const knot = balloonKnot(balloon)
    const end = ropeEnd(balloon, knot)
    context.save()
    context.beginPath()
    context.moveTo(knot.x, knot.y)
    context.lineTo(end.x, end.y)
    context.lineWidth = balloon.holderKey ? 1.8 : 1.25
    context.strokeStyle = balloon.holderKey ? 'rgba(255, 245, 199, 0.94)' : 'rgba(245, 235, 207, 0.76)'
    context.shadowColor = 'rgba(0, 0, 0, 0.42)'
    context.shadowBlur = 3
    context.stroke()
    context.restore()
  }

  const drawBalloon = (balloon: Balloon) => {
    context.save()
    context.translate(balloon.x, balloon.y)
    context.rotate(balloon.rotation)
    context.shadowColor = 'rgba(0, 0, 0, 0.24)'
    context.shadowBlur = 14
    context.shadowOffsetY = 6
    const gradient = context.createRadialGradient(-balloon.rx * 0.34, -balloon.ry * 0.38, 2, 0, 0, balloon.ry * 1.08)
    gradient.addColorStop(0, balloon.lightColor)
    gradient.addColorStop(0.28, balloon.color)
    gradient.addColorStop(1, balloon.darkColor)
    context.fillStyle = gradient
    context.beginPath()
    context.ellipse(0, 0, balloon.rx, balloon.ry, 0, 0, TAU)
    context.fill()
    context.shadowColor = 'transparent'
    context.globalAlpha = 0.5
    context.fillStyle = '#fff'
    context.beginPath()
    context.ellipse(-balloon.rx * 0.31, -balloon.ry * 0.34, balloon.rx * 0.13, balloon.ry * 0.25, -0.28, 0, TAU)
    context.fill()
    context.globalAlpha = 1
    context.fillStyle = balloon.darkColor
    context.beginPath()
    context.moveTo(-balloon.rx * 0.14, balloon.ry * 0.93)
    context.lineTo(0, balloon.ry + balloon.rx * 0.27)
    context.lineTo(balloon.rx * 0.14, balloon.ry * 0.93)
    context.closePath()
    context.fill()
    context.restore()
  }

  const drawFragments = () => {
    burstRings.forEach((ring) => {
      const opacity = clamp(ring.life / ring.maxLife, 0, 1)
      context.beginPath()
      context.arc(ring.x, ring.y, ring.radius, 0, TAU)
      context.strokeStyle = ring.color.replace('hsl(', 'hsla(').replace('%)', `% / ${opacity * 0.7})`)
      context.lineWidth = 2 + opacity * 4
      context.stroke()
    })
    fragments.forEach((fragment) => {
      const opacity = clamp(fragment.life / fragment.maxLife, 0, 1)
      context.save()
      context.translate(fragment.x, fragment.y)
      context.rotate(fragment.rotation)
      context.globalAlpha = opacity
      context.fillStyle = fragment.color
      if (fragment.kind === 'spark') {
        context.beginPath()
        context.arc(0, 0, fragment.size, 0, TAU)
        context.fill()
      } else {
        context.beginPath()
        context.moveTo(fragment.size, 0)
        context.lineTo(-fragment.size * 0.7, fragment.size * 0.48)
        context.lineTo(-fragment.size * 0.28, -fragment.size * 0.82)
        context.closePath()
        context.fill()
      }
      context.restore()
    })
  }

  const drawHands = () => {
    hands.forEach((hand) => {
      context.save()
      context.beginPath()
      context.arc(hand.index.x, hand.index.y, hand.isPinching ? 7 : 10, 0, TAU)
      context.fillStyle = hand.isPinching ? 'rgba(255, 231, 116, 0.95)' : 'rgba(255, 255, 255, 0.92)'
      context.shadowColor = hand.isPinching ? '#ffd84f' : '#fff'
      context.shadowBlur = 15
      context.fill()
      if (hand.isPinching) {
        context.beginPath()
        context.arc(hand.pinch.x, hand.pinch.y, 18, 0, TAU)
        context.strokeStyle = 'rgba(255, 225, 102, 0.85)'
        context.lineWidth = 2
        context.stroke()
      }
      context.restore()
    })
  }

  const drawScene = () => {
    context.clearRect(0, 0, width, height)
    balloons.forEach(drawRope)
    balloons.forEach(drawBalloon)
    drawFragments()
    drawHands()
  }

  const stopCamera = () => {
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    video.pause()
    video.srcObject = null
    latestResult = null
    hands.clear()
    balloons.forEach((balloon) => { balloon.holderKey = null })
    root.classList.remove('camera-ready')
    if (audioContext?.state === 'running') void audioContext.suspend()
  }

  const renderFrame = (time: number) => {
    if (!active || !stream) return
    resizeCanvas()
    const delta = clamp((time - (previousFrameTime || time - 16.67)) / 1000, 1 / 120, 0.034)
    previousFrameTime = time
    if (handLandmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      try {
        latestResult = handLandmarker.detectForVideo(video, time)
        updateHands(latestResult, time)
      } catch (error) {
        console.warn('Balloon 손 추적 프레임을 처리하지 못했습니다.', error)
      }
    }
    hands.forEach((hand, key) => {
      if (time - hand.lastSeen > 220) hands.delete(key)
    })
    tryGrabRopes()
    updateBalloons(time, delta)
    checkIndexCollisions()
    updateFragments(delta)
    drawScene()

    const detectedHands = hands.size
    const heldCount = balloons.filter((balloon) => balloon.holderKey).length
    if (heldCount > 0) setStatus('ROPE HELD', '핀치점을 따라 풍선이 실제 끈처럼 이끌리고 있어요.')
    else if (detectedHands > 0) setStatus('HANDS TRACKED', '검지로 풍선을 터뜨리거나 엄지와 검지로 끈을 잡아 보세요.')
    else setStatus('SHOW YOUR HANDS', '손바닥이 카메라를 향하도록 화면 안에 들어 주세요.')
    animationFrame = requestAnimationFrame(renderFrame)
  }

  const startCamera = async () => {
    if (starting || stream) return
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = '카메라를 지원하는 최신 브라우저에서 다시 시도해 주세요.'
      startMessage.textContent = message
      setStatus('CAMERA ERROR', message)
      return
    }
    starting = true
    const audioReady = prepareAudio()
    startButton.disabled = true
    startButton.querySelector('span')!.textContent = '준비 중…'
    startMessage.textContent = '카메라 권한을 요청하고 있어요…'
    setStatus('CAMERA', '카메라 사용 권한을 확인하고 있어요.')
    let nextStream: MediaStream | null = null
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      })
      await Promise.all([createTracker(), audioReady])
      if (!active) {
        nextStream.getTracks().forEach((track) => track.stop())
        return
      }
      stream = nextStream
      video.srcObject = nextStream
      await video.play()
      resizeCanvas()
      resetScene()
      startPanel.hidden = true
      root.classList.add('camera-ready')
      setStatus('READY TO PLAY', '검지로 풍선을 터뜨리고 핀치로 끈을 잡아 보세요.')
      lastVideoTime = -1
      previousFrameTime = performance.now()
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(renderFrame)
    } catch (error) {
      console.error('Balloon 카메라 또는 손 추적 초기화에 실패했습니다.', error)
      nextStream?.getTracks().forEach((track) => track.stop())
      const denied = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)
      const message = denied
        ? '브라우저 주소창에서 카메라 권한을 허용한 뒤 다시 눌러 주세요.'
        : '카메라와 손 추적 모델을 시작하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.'
      startMessage.textContent = message
      setStatus(denied ? 'PERMISSION NEEDED' : 'START ERROR', message)
      startPanel.hidden = false
    } finally {
      starting = false
      startButton.disabled = false
      startButton.querySelector('span')!.textContent = '카메라 시작'
    }
  }

  startButton.addEventListener('click', () => void startCamera())
  window.addEventListener('resize', resizeCanvas)

  return {
    setActive(nextActive: boolean) {
      active = nextActive
      if (active) {
        resizeCanvas()
        resetScene()
        startPanel.hidden = false
        startMessage.innerHTML = '카메라는 손의 움직임을 인식하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.'
        setStatus('CAMERA READY', '카메라를 시작해 주세요.')
      } else {
        stopCamera()
      }
    },
  }
}
