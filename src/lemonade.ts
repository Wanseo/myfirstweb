import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

type Point = { x: number; y: number }
type LemonState = 'floating' | 'held' | 'falling' | 'gone'

type Lemon = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  phase: number
  floatSpeed: number
  rotation: number
  juice: number
  maxJuice: number
  state: LemonState
  squeeze: number
}

type JuiceDrop = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  amount: number
  life: number
}

type TrackedHand = {
  side: 'Left' | 'Right'
  center: Point
  size: number
  fist: boolean
  landmarks: Point[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const BASE_URL = import.meta.env.BASE_URL
const LEMON_JUICE_AMOUNTS = [88, 105, 72, 96, 116, 82, 101]

export const initLemonade = (root: HTMLElement) => {
  const video = root.querySelector<HTMLVideoElement>('#lemonade-camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#lemonade-canvas')!
  const context = canvas.getContext('2d')!
  const startPanel = root.querySelector<HTMLElement>('.lemonade-start')!
  const startMessage = root.querySelector<HTMLElement>('#lemonade-start-message')!
  const startButton = root.querySelector<HTMLButtonElement>('#lemonade-start-button')!
  const resetButton = root.querySelector<HTMLButtonElement>('#lemonade-reset')!
  const statusLabel = root.querySelector<HTMLElement>('#lemonade-status-label')!
  const statusText = root.querySelector<HTMLElement>('#lemonade-status-text')!
  const lemonCount = root.querySelector<HTMLElement>('#lemonade-count')!
  const fillBar = root.querySelector<HTMLElement>('.lemonade-fill-bar i')!
  const fillText = root.querySelector<HTMLElement>('#lemonade-fill-value')!

  const lemonImage = new Image()
  let triedFallbackImage = false
  lemonImage.decoding = 'async'
  lemonImage.src = `${BASE_URL}lemonade/lemon.png`
  lemonImage.addEventListener('error', () => {
    if (triedFallbackImage) return
    triedFallbackImage = true
    lemonImage.src = `${BASE_URL}lemonade/lemon.svg`
  })

  let active = false
  let starting = false
  let stream: MediaStream | null = null
  let handLandmarker: HandLandmarker | null = null
  let handLandmarkerPromise: Promise<HandLandmarker> | null = null
  let animationFrame = 0
  let lastFrameTime = 0
  let lastVideoTime = -1
  let latestResult: HandLandmarkerResult | null = null
  let lemons: Lemon[] = []
  let drops: JuiceDrop[] = []
  let heldLemonId: number | null = null
  let juiceInCup = 0
  let dropAccumulator = 0
  let sceneWidth = 0
  let sceneHeight = 0
  let cupX = 0
  let cupY = 0
  let cupTargetX = 0
  let cupTargetY = 0
  let rightHandVisible = false

  const setStatus = (label: string, text: string) => {
    statusLabel.textContent = label
    statusText.textContent = text
  }

  const updateHud = () => {
    const available = lemons.filter((lemon) => lemon.state !== 'gone').length
    const fillPercent = clamp((juiceInCup / 430) * 100, 0, 100)
    lemonCount.textContent = `${available} / ${lemons.length}`
    fillText.textContent = `${Math.round(fillPercent)}%`
    fillBar.style.width = `${fillPercent}%`
  }

  const resizeCanvas = () => {
    const width = Math.max(1, root.clientWidth)
    const height = Math.max(1, root.clientHeight)
    if (width === sceneWidth && height === sceneHeight) return
    const previousWidth = sceneWidth || width
    const previousHeight = sceneHeight || height
    sceneWidth = width
    sceneHeight = height
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    if (lemons.length) {
      lemons.forEach((lemon) => {
        lemon.x *= width / previousWidth
        lemon.y *= height / previousHeight
      })
      cupX *= width / previousWidth
      cupY *= height / previousHeight
    } else {
      cupX = width / 2
      cupY = height - Math.min(145, height * 0.15)
    }
  }

  const resetGame = () => {
    resizeCanvas()
    const topOffset = sceneHeight < 620 ? 90 : 120
    const positions = [
      [0.12, 0.2], [0.3, 0.29], [0.49, 0.18], [0.68, 0.31],
      [0.86, 0.2], [0.22, 0.48], [0.77, 0.5],
    ]
    lemons = LEMON_JUICE_AMOUNTS.map((juice, index) => ({
      id: index,
      x: sceneWidth * positions[index][0],
      y: topOffset + (sceneHeight - topOffset) * positions[index][1],
      vx: (index % 2 ? -1 : 1) * (13 + index * 1.4),
      vy: (index % 3 - 1) * 7,
      radius: clamp(sceneWidth * 0.044, 38, 63),
      phase: index * 1.37,
      floatSpeed: 0.7 + index * 0.09,
      rotation: (index - 3) * 0.06,
      juice,
      maxJuice: juice,
      state: 'floating',
      squeeze: 0,
    }))
    drops = []
    heldLemonId = null
    juiceInCup = 0
    updateHud()
    setStatus('READY', '왼손 주먹으로 레몬을 잡고 꽉 쥐어 보세요.')
  }

  const createTracker = async () => {
    if (handLandmarker) return handLandmarker
    if (handLandmarkerPromise) return handLandmarkerPromise
    handLandmarkerPromise = (async () => {
      setStatus('LOADING AI', 'MediaPipe 손 추적 모델을 준비하고 있어요.')
      const vision = await FilesetResolver.forVisionTasks(`${BASE_URL}mediapipe/wasm`)
      try {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${BASE_URL}mediapipe/hand_landmarker.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.52,
          minTrackingConfidence: 0.52,
        })
      } catch {
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `${BASE_URL}mediapipe/hand_landmarker.task`, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.52,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
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

  const startCamera = async () => {
    if (starting || stream) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('CAMERA ERROR', '이 브라우저에서는 카메라를 사용할 수 없어요.')
      startPanel.hidden = false
      return
    }

    starting = true
    startButton.disabled = true
    startButton.textContent = '카메라 준비 중…'
    startMessage.textContent = '카메라 권한을 요청하고 있어요…'
    setStatus('CAMERA', '카메라 사용 권한을 확인하고 있어요.')
    let nextStream: MediaStream | null = null
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      startMessage.textContent = '카메라 연결 완료 · MediaPipe 손 추적 모델을 불러오는 중…'
      await createTracker()
      if (!active) {
        nextStream.getTracks().forEach((track) => track.stop())
        return
      }
      stream = nextStream
      video.srcObject = nextStream
      await video.play()
      startPanel.hidden = true
      root.classList.add('camera-ready')
      setStatus('TRACKING', '왼손은 레몬을 짜고, 오른손은 컵을 움직여요.')
      lastVideoTime = -1
      lastFrameTime = performance.now()
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(renderFrame)
    } catch (error) {
      console.error('Lemonade 카메라 또는 MediaPipe 초기화에 실패했습니다.', error)
      nextStream?.getTracks().forEach((track) => track.stop())
      startPanel.hidden = false
      root.classList.remove('camera-ready')
      const permissionDenied = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)
      const message = permissionDenied
        ? '브라우저 주소창의 카메라 권한을 허용한 뒤 다시 눌러 주세요.'
        : '손 추적 모델을 시작하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.'
      startMessage.textContent = message
      setStatus(permissionDenied ? 'PERMISSION NEEDED' : 'TRACKER ERROR', message)
    } finally {
      starting = false
      startButton.disabled = false
      startButton.textContent = '카메라 시작'
    }
  }

  const stopCamera = () => {
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
    latestResult = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    video.srcObject = null
    root.classList.remove('camera-ready')
    startPanel.hidden = false
    rightHandVisible = false
  }

  const screenPoint = (landmark: NormalizedLandmark): Point => {
    const videoWidth = video.videoWidth || sceneWidth
    const videoHeight = video.videoHeight || sceneHeight
    const scale = Math.max(sceneWidth / videoWidth, sceneHeight / videoHeight)
    const drawnWidth = videoWidth * scale
    const drawnHeight = videoHeight * scale
    const offsetX = (sceneWidth - drawnWidth) / 2
    const offsetY = (sceneHeight - drawnHeight) / 2
    return {
      x: sceneWidth - (offsetX + landmark.x * drawnWidth),
      y: offsetY + landmark.y * drawnHeight,
    }
  }

  const isFist = (landmarks: NormalizedLandmark[]) => {
    const wrist = landmarks[0]
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]]
    const folded = fingers.filter(([tip, pip]) => distance(landmarks[tip], wrist) < distance(landmarks[pip], wrist) * 1.13).length
    const palmWidth = distance(landmarks[5], landmarks[17])
    const fingertipSpread = distance(landmarks[8], landmarks[20])
    return folded >= 3 && fingertipSpread < palmWidth * 1.45
  }

  const getTrackedHands = (): TrackedHand[] => {
    if (!latestResult) return []
    return latestResult.landmarks.map((landmarks, index) => {
      const points = landmarks.map(screenPoint)
      const palmIndices = [0, 5, 9, 13, 17]
      const center = palmIndices.reduce((sum, landmarkIndex) => ({
        x: sum.x + points[landmarkIndex].x / palmIndices.length,
        y: sum.y + points[landmarkIndex].y / palmIndices.length,
      }), { x: 0, y: 0 })
      const rawSide = latestResult?.handedness[index]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right'
      // MediaPipe handedness assumes mirrored selfie input; detection receives the raw camera frame.
      const side: 'Left' | 'Right' = rawSide === 'Left' ? 'Right' : 'Left'
      return {
        side,
        center,
        size: distance(points[0], points[9]) * 2.15,
        fist: isFist(landmarks),
        landmarks: points,
      }
    })
  }

  const releaseHeldLemon = () => {
    if (heldLemonId === null) return
    const held = lemons.find((lemon) => lemon.id === heldLemonId)
    if (held && held.state === 'held') {
      held.state = 'floating'
      held.vx = (Math.random() - 0.5) * 24
      held.vy = -8
      held.squeeze = 0
    }
    heldLemonId = null
  }

  const addJuiceDrop = (lemon: Lemon) => {
    drops.push({
      x: lemon.x + (Math.random() - 0.5) * lemon.radius * 0.35,
      y: lemon.y + lemon.radius * (0.28 + lemon.squeeze * 0.24),
      vx: (Math.random() - 0.5) * 34,
      vy: 125 + Math.random() * 80,
      radius: 3.2 + Math.random() * 3.8,
      amount: 1.25,
      life: 4,
    })
  }

  const updateHandsAndLemons = (hands: TrackedHand[], delta: number) => {
    const leftHand = hands.find((hand) => hand.side === 'Left')
    const rightHand = hands.find((hand) => hand.side === 'Right')
    rightHandVisible = Boolean(rightHand)

    if (rightHand) {
      cupTargetX = clamp(rightHand.center.x, 90, sceneWidth - 90)
      cupTargetY = clamp(rightHand.center.y + 55, 170, sceneHeight - 22)
    } else {
      cupTargetX = sceneWidth / 2
      cupTargetY = sceneHeight - Math.min(145, sceneHeight * 0.15)
    }

    if (!leftHand?.fist) {
      releaseHeldLemon()
      return
    }

    if (heldLemonId === null) {
      const grabRange = Math.max(82, leftHand.size * 0.72)
      const nearest = lemons
        .filter((lemon) => lemon.state === 'floating')
        .map((lemon) => ({ lemon, distance: distance(lemon, leftHand.center) }))
        .filter((candidate) => candidate.distance < grabRange)
        .sort((a, b) => a.distance - b.distance)[0]
      if (nearest) {
        heldLemonId = nearest.lemon.id
        nearest.lemon.state = 'held'
        setStatus('SQUEEZING', `레몬 ${nearest.lemon.id + 1}의 즙을 짜는 중이에요.`)
      }
    }

    const held = lemons.find((lemon) => lemon.id === heldLemonId)
    if (!held) return
    held.x = lerp(held.x, leftHand.center.x, 0.44)
    held.y = lerp(held.y, leftHand.center.y, 0.44)
    held.squeeze = clamp(held.squeeze + delta * 3.1, 0, 1)
    const squeezed = Math.min(held.juice, delta * 19)
    held.juice -= squeezed
    dropAccumulator += squeezed
    while (dropAccumulator >= 1.25) {
      addJuiceDrop(held)
      dropAccumulator -= 1.25
    }

    if (held.juice <= 0.01) {
      held.juice = 0
      held.state = 'falling'
      held.vx = (Math.random() - 0.5) * 90
      held.vy = 85
      held.squeeze = 1
      heldLemonId = null
      setStatus('EMPTY LEMON', '레몬을 모두 짰어요. 납작해진 레몬이 떨어집니다.')
    }
  }

  const updatePhysics = (delta: number, time: number) => {
    const cupFollow = 1 - Math.pow(0.0004, delta)
    cupX = lerp(cupX || cupTargetX, cupTargetX, cupFollow)
    cupY = lerp(cupY || cupTargetY, cupTargetY, cupFollow)

    lemons.forEach((lemon) => {
      if (lemon.state === 'floating') {
        lemon.x += lemon.vx * delta
        lemon.y += lemon.vy * delta + Math.sin(time * 0.001 * lemon.floatSpeed + lemon.phase) * 8 * delta
        const margin = lemon.radius * 1.15
        const top = 105 + margin
        const bottom = sceneHeight * 0.66
        if (lemon.x < margin || lemon.x > sceneWidth - margin) {
          lemon.x = clamp(lemon.x, margin, sceneWidth - margin)
          lemon.vx *= -1
        }
        if (lemon.y < top || lemon.y > bottom) {
          lemon.y = clamp(lemon.y, top, bottom)
          lemon.vy = lemon.y <= top ? Math.abs(lemon.vy || 7) : -Math.abs(lemon.vy || 7)
        }
      } else if (lemon.state === 'falling') {
        lemon.vy += 760 * delta
        lemon.x += lemon.vx * delta
        lemon.y += lemon.vy * delta
        lemon.rotation += delta * 1.9
        if (lemon.y > sceneHeight + lemon.radius * 2) lemon.state = 'gone'
      }
    })

    const cupWidth = clamp(sceneWidth * 0.15, 138, 220)
    const cupHeight = cupWidth * 0.86
    const cupTop = cupY - cupHeight
    drops.forEach((drop) => {
      drop.vy += 580 * delta
      drop.x += drop.vx * delta
      drop.y += drop.vy * delta
      drop.life -= delta
      const insideCup = drop.vy > 0
        && drop.y >= cupTop + 10
        && drop.y <= cupY + 10
        && Math.abs(drop.x - cupX) < cupWidth * 0.42
      if (insideCup) {
        juiceInCup = clamp(juiceInCup + drop.amount, 0, 430)
        drop.life = 0
      }
    })
    drops = drops.filter((drop) => drop.life > 0 && drop.y < sceneHeight + 30)
    updateHud()
  }

  const drawLemon = (lemon: Lemon, time: number) => {
    if (lemon.state === 'gone') return
    const remaining = lemon.maxJuice ? lemon.juice / lemon.maxJuice : 0
    const squeeze = lemon.state === 'falling' ? 1 : lemon.squeeze
    const scaleX = 1 + squeeze * 0.42
    const scaleY = Math.max(0.25, 1 - squeeze * 0.62 - (1 - remaining) * 0.12)
    const bob = lemon.state === 'floating' ? Math.sin(time * 0.0012 * lemon.floatSpeed + lemon.phase) * 7 : 0
    const rotation = lemon.rotation + (lemon.state === 'floating' ? Math.sin(time * 0.0008 + lemon.phase) * 0.11 : 0)
    context.save()
    context.translate(lemon.x, lemon.y + bob)
    context.rotate(rotation)
    context.scale(scaleX, scaleY)
    const width = lemon.radius * 2.35
    const height = lemon.radius * 1.72
    if (lemonImage.complete && lemonImage.naturalWidth > 0) {
      context.drawImage(lemonImage, -width / 2, -height / 2, width, height)
    } else {
      context.fillStyle = '#f5d51f'
      context.beginPath()
      context.ellipse(0, 0, lemon.radius, lemon.radius * 0.72, 0, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()

    if (lemon.state === 'floating' || lemon.state === 'held') {
      const meterWidth = lemon.radius * 1.25
      context.fillStyle = 'rgba(8, 16, 10, .48)'
      context.fillRect(lemon.x - meterWidth / 2, lemon.y + lemon.radius + 12, meterWidth, 4)
      context.fillStyle = '#ffe43b'
      context.fillRect(lemon.x - meterWidth / 2, lemon.y + lemon.radius + 12, meterWidth * remaining, 4)
    }
  }

  const drawDrops = () => {
    context.save()
    context.fillStyle = '#ffe33d'
    context.shadowColor = 'rgba(255, 211, 0, .75)'
    context.shadowBlur = 7
    drops.forEach((drop) => {
      context.beginPath()
      context.ellipse(drop.x, drop.y, drop.radius * 0.62, drop.radius * 1.55, 0, 0, Math.PI * 2)
      context.fill()
    })
    context.restore()
  }

  const cupPath = (width: number, height: number) => {
    context.beginPath()
    context.moveTo(cupX - width / 2, cupY - height)
    context.lineTo(cupX + width / 2, cupY - height)
    context.lineTo(cupX + width * 0.39, cupY)
    context.quadraticCurveTo(cupX, cupY + 13, cupX - width * 0.39, cupY)
    context.closePath()
  }

  const drawCup = (time: number) => {
    const width = clamp(sceneWidth * 0.15, 138, 220)
    const height = width * 0.86
    const fillRatio = clamp(juiceInCup / 430, 0, 1)
    const liquidBottom = cupY - 3
    const liquidTop = liquidBottom - (height - 16) * fillRatio

    context.save()
    cupPath(width, height)
    context.clip()

    if (fillRatio > 0) {
      const gradient = context.createLinearGradient(0, liquidTop, 0, liquidBottom)
      gradient.addColorStop(0, 'rgba(255, 244, 83, .82)')
      gradient.addColorStop(1, 'rgba(245, 187, 0, .9)')
      context.fillStyle = gradient
      context.fillRect(cupX - width / 2, liquidTop, width, liquidBottom - liquidTop + 14)
      context.fillStyle = 'rgba(255,255,202,.55)'
      context.fillRect(cupX - width * 0.45, liquidTop, width * 0.9, 3)
    }

    const iceBaseY = fillRatio > 0 ? Math.max(cupY - height + 30, liquidTop + 18) : cupY - height * 0.46
    const iceLift = fillRatio * height * 0.16
    const icePositions = [-0.22, 0.03, 0.25]
    icePositions.forEach((offset, index) => {
      const bob = Math.sin(time * 0.002 + index * 1.8) * (2 + fillRatio * 3)
      context.save()
      context.translate(cupX + width * offset, iceBaseY - iceLift + bob)
      context.rotate((index - 1) * 0.22)
      context.fillStyle = 'rgba(231, 252, 255, .46)'
      context.strokeStyle = 'rgba(255, 255, 255, .86)'
      context.lineWidth = 2
      context.beginPath()
      context.roundRect(-17, -14, 34, 28, 6)
      context.fill()
      context.stroke()
      context.restore()
    })

    const sliceY = iceBaseY - iceLift + 4
    context.strokeStyle = '#fff06a'
    context.fillStyle = 'rgba(247, 213, 23, .4)'
    context.lineWidth = 5
    context.beginPath()
    context.arc(cupX + width * 0.26, sliceY, 24, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.restore()

    context.save()
    cupPath(width, height)
    context.fillStyle = 'rgba(235, 250, 255, .08)'
    context.strokeStyle = rightHandVisible ? 'rgba(255, 242, 88, .95)' : 'rgba(255,255,255,.9)'
    context.lineWidth = rightHandVisible ? 4 : 3
    context.shadowColor = 'rgba(0,0,0,.2)'
    context.shadowBlur = 10
    context.fill()
    context.stroke()
    context.beginPath()
    context.ellipse(cupX, cupY - height, width / 2, 10, 0, 0, Math.PI * 2)
    context.stroke()
    context.restore()
  }

  const drawHands = (hands: TrackedHand[]) => {
    const connections = HandLandmarker.HAND_CONNECTIONS
    hands.forEach((hand) => {
      context.save()
      context.strokeStyle = hand.side === 'Left' ? 'rgba(255, 232, 56, .72)' : 'rgba(145, 239, 255, .72)'
      context.fillStyle = hand.side === 'Left' ? '#ffe838' : '#91efff'
      context.lineWidth = 2
      connections.forEach(({ start, end }) => {
        context.beginPath()
        context.moveTo(hand.landmarks[start].x, hand.landmarks[start].y)
        context.lineTo(hand.landmarks[end].x, hand.landmarks[end].y)
        context.stroke()
      })
      hand.landmarks.forEach((point, index) => {
        context.beginPath()
        context.arc(point.x, point.y, index === 0 ? 4 : 2.5, 0, Math.PI * 2)
        context.fill()
      })
      context.font = '700 11px Nunito, sans-serif'
      context.textAlign = 'center'
      context.fillText(`${hand.side === 'Left' ? 'LEFT · SQUEEZE' : 'RIGHT · CUP'}${hand.fist ? ' ✊' : ''}`, hand.center.x, hand.center.y - hand.size * 0.65)
      context.restore()
    })
  }

  const renderFrame = (time: number) => {
    if (!active || !stream) return
    resizeCanvas()
    const delta = clamp((time - lastFrameTime) / 1000, 0.001, 0.04)
    lastFrameTime = time

    if (handLandmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      try {
        latestResult = handLandmarker.detectForVideo(video, time)
      } catch (error) {
        console.warn('MediaPipe frame detection failed.', error)
      }
    }

    const hands = getTrackedHands()
    updateHandsAndLemons(hands, delta)
    updatePhysics(delta, time)
    context.clearRect(0, 0, sceneWidth, sceneHeight)
    lemons.forEach((lemon) => drawLemon(lemon, time))
    drawDrops()
    drawCup(time)
    drawHands(hands)

    if (lemons.every((lemon) => lemon.state === 'gone')) {
      setStatus('ALL SQUEEZED', '레모네이드 완성! 다시 시작해서 한 잔 더 만들어 보세요.')
    } else if (!hands.length) {
      setStatus('SHOW YOUR HANDS', '양손이 카메라에 잘 보이도록 들어 주세요.')
    }

    animationFrame = requestAnimationFrame(renderFrame)
  }

  startButton.addEventListener('click', () => void startCamera())
  resetButton.addEventListener('click', resetGame)
  window.addEventListener('resize', resizeCanvas)
  resetGame()

  return {
    setActive(nextActive: boolean) {
      active = nextActive
      if (active) {
        resizeCanvas()
        resetGame()
        startPanel.hidden = false
        startMessage.innerHTML = '카메라는 손의 움직임을 인식하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.'
        setStatus('CAMERA READY', '아래 버튼을 눌러 카메라를 시작해 주세요.')
      } else {
        releaseHeldLemon()
        stopCamera()
      }
    },
  }
}
