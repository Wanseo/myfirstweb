import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

type Point = { x: number; y: number }

type FingerTrack = {
  key: string
  x: number
  y: number
  previousX: number
  previousY: number
  speed: number
  lastSeen: number
  fingerIndex: number
}

type HandPose = {
  key: string
  x: number
  y: number
  pinchX: number
  pinchY: number
  speed: number
  pinch: boolean
  closed: boolean
  open: boolean
  lastSeen: number
}

type WaterRenderer = {
  render: (video: HTMLVideoElement, touches: FingerTrack[], time: number) => void
  resize: () => void
  reset: () => void
}

type Fish = {
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  cruiseSpeed: number
  size: number
  sizeScale: number
  depth: number
  phase: number
  panic: number
  homeX: number
  homeY: number
  lastFrightenedAt: number
  color: string
}

type Bubble = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
}

type AvoidanceZone = {
  x: number
  y: number
  radius: number
  strength: number
  life: number
  maxLife: number
}

type FoodPellet = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
}

type FishSchool = {
  render: (touches: FingerTrack[], hands: HandPose[], time: number) => void
  resize: () => void
  reset: () => void
  toggleFeeder: (point: Point) => boolean
  getFoodState: () => 'hidden' | 'ready' | 'feeding'
}

const BASE_URL = import.meta.env.BASE_URL
const FINGERTIP_INDICES = [4, 8, 12, 16, 20]
const MAX_TOUCHES = 10
const SPLASH_FILE = 'ElevenLabs_Soft_splash_sounds,_calming_and_soothing.mp3'
const SPLASH_URL = `${BASE_URL}watertouch/${SPLASH_FILE}`
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('WebGL 셰이더를 만들 수 없습니다.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(shader) ?? '알 수 없는 셰이더 오류'
    gl.deleteShader(shader)
    throw new Error(reason)
  }
  return shader
}

const createWaterRenderer = (canvas: HTMLCanvasElement): WaterRenderer => {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('이 브라우저에서는 WebGL 물결 효과를 사용할 수 없습니다.')

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVideo;
    uniform sampler2D uHeight;
    uniform vec2 uHeightTexel;
    uniform vec2 uVideoScale;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uTouches[${MAX_TOUCHES}];

    void main() {
      float leftHeight = texture2D(uHeight, vUv - vec2(uHeightTexel.x, 0.0)).r;
      float rightHeight = texture2D(uHeight, vUv + vec2(uHeightTexel.x, 0.0)).r;
      float downHeight = texture2D(uHeight, vUv - vec2(0.0, uHeightTexel.y)).r;
      float upHeight = texture2D(uHeight, vUv + vec2(0.0, uHeightTexel.y)).r;
      vec2 slope = vec2(leftHeight - rightHeight, downHeight - upHeight);

      vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
      float touchLight = 0.0;
      for (int i = 0; i < ${MAX_TOUCHES}; i++) {
        vec3 touch = uTouches[i];
        if (touch.z < 0.0) continue;
        vec2 delta = (vUv - touch.xy) * aspect;
        float radius = length(delta);
        float pulse = sin(radius * 112.0 - uTime * (8.0 + touch.z * 2.0));
        float envelope = exp(-radius * 17.0) * (0.34 + touch.z * 0.28);
        slope += normalize(delta + vec2(0.0001)) * pulse * envelope * 0.018;
        touchLight += exp(-pow((radius - 0.018) * 115.0, 2.0)) * 0.16;
      }

      vec2 refracted = clamp(vUv + slope * 0.105, 0.002, 0.998);
      vec2 videoUv = (refracted - 0.5) * uVideoScale + 0.5;
      videoUv.x = 1.0 - videoUv.x;

      vec2 chroma = slope * 0.018;
      float red = texture2D(uVideo, clamp(videoUv + chroma, 0.001, 0.999)).r;
      float green = texture2D(uVideo, videoUv).g;
      float blue = texture2D(uVideo, clamp(videoUv - chroma, 0.001, 0.999)).b;
      vec3 color = vec3(red, green, blue);
      float surface = clamp(length(slope) * 5.2, 0.0, 0.22);
      color += vec3(0.34, 0.75, 0.92) * surface + vec3(0.52, 0.9, 1.0) * touchLight;
      color *= 0.93 + 0.07 * smoothstep(-0.1, 0.12, slope.y);
      gl_FragColor = vec4(color, 1.0);
    }
  `)
  const program = gl.createProgram()
  if (!program) throw new Error('WebGL 프로그램을 만들 수 없습니다.')
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL 연결 오류')
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  const videoTexture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, videoTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([5, 12, 18, 255]))

  const heightTexture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, heightTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

  const videoUniform = gl.getUniformLocation(program, 'uVideo')
  const heightUniform = gl.getUniformLocation(program, 'uHeight')
  const heightTexelUniform = gl.getUniformLocation(program, 'uHeightTexel')
  const videoScaleUniform = gl.getUniformLocation(program, 'uVideoScale')
  const resolutionUniform = gl.getUniformLocation(program, 'uResolution')
  const timeUniform = gl.getUniformLocation(program, 'uTime')
  const touchesUniform = gl.getUniformLocation(program, 'uTouches[0]')
  gl.uniform1i(videoUniform, 0)
  gl.uniform1i(heightUniform, 1)

  let gridWidth = 0
  let gridHeight = 0
  let current = new Float32Array(0)
  let previous = new Float32Array(0)
  let next = new Float32Array(0)
  let encoded = new Uint8Array(0)
  let lastTime = 0
  let accumulator = 0
  let videoInitialized = false

  const reset = () => {
    current.fill(0)
    previous.fill(0)
    next.fill(0)
    encoded.fill(128)
    lastTime = 0
    accumulator = 0
    videoInitialized = false
  }

  const resize = () => {
    const bounds = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 1.65)
    const width = Math.max(1, Math.round(bounds.width * ratio))
    const height = Math.max(1, Math.round(bounds.height * ratio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    const targetHeight = 112
    const targetWidth = clamp(Math.round(targetHeight * bounds.width / Math.max(bounds.height, 1)), 112, 224)
    if (targetWidth !== gridWidth || targetHeight !== gridHeight) {
      gridWidth = targetWidth
      gridHeight = targetHeight
      const cellCount = gridWidth * gridHeight
      current = new Float32Array(cellCount)
      previous = new Float32Array(cellCount)
      next = new Float32Array(cellCount)
      encoded = new Uint8Array(cellCount)
      reset()
    }
  }

  const disturb = (x: number, y: number, amount: number, radius: number) => {
    const centerX = x * (gridWidth - 1)
    const centerY = y * (gridHeight - 1)
    const cellRadius = Math.max(1.5, radius * gridHeight)
    const minX = Math.max(1, Math.floor(centerX - cellRadius))
    const maxX = Math.min(gridWidth - 2, Math.ceil(centerX + cellRadius))
    const minY = Math.max(1, Math.floor(centerY - cellRadius))
    const maxY = Math.min(gridHeight - 2, Math.ceil(centerY + cellRadius))
    for (let gridY = minY; gridY <= maxY; gridY += 1) {
      for (let gridX = minX; gridX <= maxX; gridX += 1) {
        const dx = gridX - centerX
        const dy = gridY - centerY
        const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / cellRadius)
        current[gridY * gridWidth + gridX] += amount * falloff * falloff
      }
    }
  }

  const simulate = (touches: FingerTrack[], time: number) => {
    for (let y = 1; y < gridHeight - 1; y += 1) {
      const row = y * gridWidth
      for (let x = 1; x < gridWidth - 1; x += 1) {
        const index = row + x
        const laplacian = current[index - 1] + current[index + 1]
          + current[index - gridWidth] + current[index + gridWidth] - current[index] * 4
        next[index] = clamp((current[index] * 2 - previous[index] + laplacian * 0.235) * 0.989, -0.42, 0.42)
      }
    }

    const recycled = previous
    previous = current
    current = next
    next = recycled
    next.fill(0)

    touches.forEach((touch) => {
      const movement = Math.hypot(touch.x - touch.previousX, touch.y - touch.previousY)
      const steps = clamp(Math.ceil(movement * gridHeight * 0.7), 1, 8)
      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps
        const x = touch.previousX + (touch.x - touch.previousX) * progress
        const y = touch.previousY + (touch.y - touch.previousY) * progress
        const pulse = Math.sin(time * 0.011 + touch.fingerIndex * 1.17) * 0.006
        disturb(x, y, pulse + 0.008 + touch.speed * 0.016, 0.018 + touch.speed * 0.008)
      }
      touch.previousX = touch.x
      touch.previousY = touch.y
    })
  }

  const render = (video: HTMLVideoElement, touches: FingerTrack[], time: number) => {
    resize()
    if (!lastTime) lastTime = time
    accumulator += Math.min(50, time - lastTime)
    lastTime = time
    let steps = 0
    while (accumulator >= 16.667 && steps < 3) {
      simulate(touches, time)
      accumulator -= 16.667
      steps += 1
    }

    for (let index = 0; index < current.length; index += 1) {
      encoded[index] = Math.round(128 + clamp(current[index], -0.4, 0.4) * 310)
    }
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, heightTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gridWidth, gridHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, encoded)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, videoTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    try {
      if (videoInitialized) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video)
      else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        videoInitialized = true
      }
    } catch {
      videoInitialized = false
    }

    const canvasAspect = canvas.width / Math.max(canvas.height, 1)
    const videoAspect = video.videoWidth / Math.max(video.videoHeight, 1)
    const scaleX = videoAspect > canvasAspect ? canvasAspect / videoAspect : 1
    const scaleY = videoAspect > canvasAspect ? 1 : videoAspect / canvasAspect
    const touchData = new Float32Array(MAX_TOUCHES * 3).fill(-1)
    touches.slice(0, MAX_TOUCHES).forEach((touch, index) => {
      touchData[index * 3] = touch.x
      touchData[index * 3 + 1] = touch.y
      touchData[index * 3 + 2] = clamp(touch.speed, 0, 1.5)
    })

    gl.useProgram(program)
    gl.uniform2f(heightTexelUniform, 1 / gridWidth, 1 / gridHeight)
    gl.uniform2f(videoScaleUniform, scaleX, scaleY)
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height)
    gl.uniform1f(timeUniform, time / 1000)
    gl.uniform3fv(touchesUniform, touchData)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  resize()
  return { render, resize, reset }
}

const createFishSchool = (canvas: HTMLCanvasElement): FishSchool => {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('물고기 캔버스를 만들 수 없습니다.')
  const colors = ['#f3c86d', '#79d5d8', '#ec907b', '#a8d4c9', '#94b9dc', '#f0b087', '#d99fd5', '#9fc97d', '#efcf9a']
  const sizeScales = [0.16, 0.12, 0.098, 0.083, 0.068, 0.052, 0.108, 0.075, 0.059]
  const cruiseSpeeds = [0.03, 0.041, 0.053, 0.066, 0.08, 0.096, 0.047, 0.073, 0.088]
  const homePositions = [
    [0.5, 0.5], [0.35, 0.39], [0.65, 0.4],
    [0.4, 0.62], [0.6, 0.63], [0.28, 0.53],
    [0.72, 0.54], [0.5, 0.3], [0.5, 0.72],
  ]
  let width = 1
  let height = 1
  let ratio = 1
  let lastTime = 0
  let fish: Fish[] = []
  let bubbles: Bubble[] = []
  let avoidanceZones: AvoidanceZone[] = []
  let foodPellets: FoodPellet[] = []
  let feederVisible = false
  let feederX = 0.5
  let feederY = 0.62
  let feederPreviousX = feederX
  let feederPreviousY = feederY
  let feederAngle = 0
  let grabbedBy: string | null = null
  let grabLostAt = 0
  let lastFeedAt = 0
  const lastZoneTimes = new Map<string, number>()

  const makeFish = (index: number): Fish => {
    const heading = Math.random() < 0.5 ? Math.random() * 0.7 - 0.35 : Math.PI + Math.random() * 0.7 - 0.35
    const cruiseSpeed = cruiseSpeeds[index % cruiseSpeeds.length] * 1.55
    const sizeScale = sizeScales[index % sizeScales.length]
    const home = homePositions[index % homePositions.length]
    return {
      x: 0.06 + Math.random() * 0.88,
      y: 0.19 + Math.random() * 0.68,
      vx: Math.cos(heading) * cruiseSpeed,
      vy: Math.sin(heading) * cruiseSpeed,
      heading,
      cruiseSpeed,
      // The drawn fish is about 1.55 times this base size from tail to nose.
      size: clamp(width * sizeScale, 22, 230 * sizeScale / sizeScales[0]),
      sizeScale,
      depth: 0.4 + Math.random() * 0.6,
      phase: index * 1.83 + Math.random() * Math.PI,
      panic: 0,
      homeX: home[0],
      homeY: home[1],
      lastFrightenedAt: -10000,
      color: colors[index % colors.length],
    }
  }

  const resize = () => {
    const bounds = canvas.getBoundingClientRect()
    width = Math.max(1, bounds.width)
    height = Math.max(1, bounds.height)
    ratio = Math.min(window.devicePixelRatio || 1, 2)
    const pixelWidth = Math.round(width * ratio)
    const pixelHeight = Math.round(height * ratio)
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    fish.forEach((swimmer) => {
      swimmer.size = clamp(width * swimmer.sizeScale, 22, 230 * swimmer.sizeScale / sizeScales[0])
    })
  }

  const reset = () => {
    resize()
    fish = Array.from({ length: 9 }, (_, index) => makeFish(index))
    bubbles = []
    avoidanceZones = []
    foodPellets = []
    feederVisible = false
    grabbedBy = null
    grabLostAt = 0
    feederAngle = 0
    lastFeedAt = 0
    lastZoneTimes.clear()
    lastTime = 0
    context.clearRect(0, 0, width, height)
  }

  const toggleFeeder = (point: Point) => {
    feederVisible = !feederVisible
    grabbedBy = null
    grabLostAt = 0
    if (feederVisible) {
      feederX = clamp(point.x, 0.12, 0.88)
      feederY = clamp(1 - point.y, 0.22, 0.78)
      feederPreviousX = feederX
      feederPreviousY = feederY
      feederAngle = 0
    }
    return feederVisible
  }

  const getFoodState = (): 'hidden' | 'ready' | 'feeding' => {
    if (!feederVisible) return 'hidden'
    return grabbedBy ? 'feeding' : 'ready'
  }

  const addPanicBubble = (swimmer: Fish) => {
    if (bubbles.length >= 64) return
    bubbles.push({
      x: swimmer.x + (Math.random() - 0.5) * 0.015,
      y: swimmer.y + (Math.random() - 0.5) * 0.012,
      vx: -swimmer.vx * 0.08 + (Math.random() - 0.5) * 0.012,
      vy: -0.035 - Math.random() * 0.03,
      radius: 1.2 + Math.random() * 2.3,
      life: 0.65 + Math.random() * 0.65,
    })
  }

  const scatterFood = (speed: number) => {
    const amount = speed > 0.65 ? 4 : speed > 0.35 ? 3 : 2
    for (let index = 0; index < amount; index += 1) {
      foodPellets.push({
        x: feederX + Math.sin(feederAngle) * 0.045 + (Math.random() - 0.5) * 0.025,
        y: feederY + Math.cos(feederAngle) * 0.035 + (Math.random() - 0.5) * 0.018,
        vx: Math.sin(feederAngle) * (0.05 + speed * 0.08) + (Math.random() - 0.5) * 0.07,
        vy: 0.025 + Math.random() * 0.045,
        radius: 1.8 + Math.random() * 1.7,
        life: 9 + Math.random() * 5,
      })
    }
    if (foodPellets.length > 90) foodPellets.splice(0, foodPellets.length - 90)
  }

  const updateFeeder = (hands: HandPose[], time: number, delta: number) => {
    if (feederVisible) {
      if (grabbedBy) {
        const holder = hands.find((hand) => hand.key === grabbedBy)
        if (!holder || !holder.pinch) {
          if (!grabLostAt) grabLostAt = time
          if (time - grabLostAt > 260) {
            grabbedBy = null
            grabLostAt = 0
          }
        } else {
          grabLostAt = 0
        }
        if (holder && grabbedBy) {
          const targetX = clamp(holder.pinchX, 0.08, 0.92)
          const targetY = clamp(1 - holder.pinchY, 0.12, 0.88)
          feederX += (targetX - feederX) * Math.min(1, delta * 24)
          feederY += (targetY - feederY) * Math.min(1, delta * 24)
          const movementX = feederX - feederPreviousX
          const movementY = feederY - feederPreviousY
          const targetAngle = clamp(Math.atan2(movementX, Math.abs(movementY) + 0.004), -1.15, 1.15)
          feederAngle += (targetAngle - feederAngle) * Math.min(1, delta * 10)
          if (holder.pinch && holder.speed > 0.16 && time - lastFeedAt > 72) {
            scatterFood(holder.speed)
            lastFeedAt = time
          }
        }
      } else {
        const aspect = width / Math.max(height, 1)
        const candidate = hands
          .filter((hand) => hand.pinch)
          .map((hand) => ({
            hand,
            distance: Math.hypot((hand.pinchX - feederX) * aspect, (1 - hand.pinchY) - feederY),
          }))
          .filter(({ distance }) => distance < 0.2)
          .sort((a, b) => a.distance - b.distance)[0]
        if (candidate) {
          grabbedBy = candidate.hand.key
          grabLostAt = 0
        }
        feederAngle *= Math.pow(0.04, delta)
      }
      feederPreviousX = feederX
      feederPreviousY = feederY
    }

    foodPellets.forEach((pellet) => {
      pellet.x += pellet.vx * delta
      pellet.y += pellet.vy * delta
      pellet.vx += Math.sin(time * 0.0016 + pellet.x * 17) * delta * 0.004
      pellet.vx *= Math.pow(0.7, delta)
      pellet.vy = Math.min(0.06, pellet.vy + delta * 0.004)
      pellet.life -= delta
    })
    foodPellets = foodPellets.filter((pellet) => pellet.life > 0 && pellet.y < 0.96 && pellet.x > 0.02 && pellet.x < 0.98)
  }

  const updateFish = (touches: FingerTrack[], time: number, delta: number) => {
    const aspect = width / Math.max(height, 1)
    const center = fish.reduce((sum, swimmer) => ({ x: sum.x + swimmer.x / fish.length, y: sum.y + swimmer.y / fish.length }), { x: 0, y: 0 })
    const handGroups = new Map<string, FingerTrack[]>()
    touches.forEach((touch) => {
      const separator = touch.key.lastIndexOf('-')
      const handKey = separator > 0 ? touch.key.slice(0, separator) : touch.key
      const group = handGroups.get(handKey) ?? []
      group.push(touch)
      handGroups.set(handKey, group)
    })
    const activeHandZones: AvoidanceZone[] = []
    handGroups.forEach((group, handKey) => {
      const x = group.reduce((sum, touch) => sum + touch.x, 0) / group.length
      const y = 1 - group.reduce((sum, touch) => sum + touch.y, 0) / group.length
      const speed = Math.max(...group.map((touch) => touch.speed))
      activeHandZones.push({
        x,
        y,
        radius: 0.19 + clamp(speed, 0, 1.2) * 0.075,
        strength: 0.75 + clamp(speed, 0, 1.4) * 1.15,
        life: 1,
        maxLife: 1,
      })
      const lastZoneTime = lastZoneTimes.get(handKey) ?? 0
      if (speed > 0.11 && time - lastZoneTime > 65) {
        avoidanceZones.push({
          x,
          y,
          radius: 0.16 + clamp(speed, 0, 1.2) * 0.07,
          strength: 0.9 + clamp(speed, 0, 1.4) * 1.2,
          life: 0.78,
          maxLife: 0.78,
        })
        lastZoneTimes.set(handKey, time)
      }
    })
    if (avoidanceZones.length > 36) avoidanceZones.splice(0, avoidanceZones.length - 36)

    const repelFromZone = (swimmer: Fish, zone: AvoidanceZone) => {
      let dx = (swimmer.x - zone.x) * aspect
      let dy = swimmer.y - zone.y
      let distance = Math.hypot(dx, dy)
      if (distance >= zone.radius) return
      if (distance < 0.002) {
        const escapeAngle = swimmer.phase + time * 0.001
        dx = Math.cos(escapeAngle) * 0.002
        dy = Math.sin(escapeAngle) * 0.002
        distance = 0.002
      }
      const proximity = 1 - distance / zone.radius
      const fade = clamp(zone.life / zone.maxLife, 0, 1)
      const force = zone.strength * Math.pow(proximity, 1.35) * fade
      swimmer.vx += dx / distance / aspect * force * delta * 2.35
      swimmer.vy += dy / distance * force * delta * 2.35
      swimmer.panic = Math.max(swimmer.panic, clamp(proximity * 0.95 + force * 0.32, 0, 1))
      swimmer.lastFrightenedAt = time
      if (swimmer.panic > 0.5 && Math.random() < delta * 8) addPanicBubble(swimmer)
    }

    fish.forEach((swimmer, index) => {
      let seekingFood = false
      swimmer.heading += Math.sin(time * 0.00037 + swimmer.phase) * delta * 0.42
      const desiredX = Math.cos(swimmer.heading) * swimmer.cruiseSpeed
      const desiredY = Math.sin(swimmer.heading) * swimmer.cruiseSpeed
      swimmer.vx += (desiredX - swimmer.vx) * delta * (0.32 + (1 - swimmer.panic) * 0.55)
      swimmer.vy += (desiredY - swimmer.vy) * delta * (0.32 + (1 - swimmer.panic) * 0.55)

      swimmer.vx += (center.x - swimmer.x) * delta * 0.005
      swimmer.vy += (center.y - swimmer.y) * delta * 0.005

      fish.forEach((neighbor, neighborIndex) => {
        if (index === neighborIndex) return
        const dx = (swimmer.x - neighbor.x) * aspect
        const dy = swimmer.y - neighbor.y
        const distanceSquared = dx * dx + dy * dy
        if (distanceSquared > 0.00001 && distanceSquared < 0.0022) {
          const separation = (0.0022 - distanceSquared) / 0.0022
          swimmer.vx += dx / aspect * separation * delta * 0.18
          swimmer.vy += dy * separation * delta * 0.18
        }
      })

      touches.forEach((touch) => {
        const touchY = 1 - touch.y
        const dx = (swimmer.x - touch.x) * aspect
        const dy = swimmer.y - touchY
        const distance = Math.max(0.001, Math.hypot(dx, dy))
        const splashStrength = clamp(touch.speed, 0, 1.4)
        const fleeRadius = 0.145 + splashStrength * 0.08
        if (distance >= fleeRadius) return
        const proximity = 1 - distance / fleeRadius
        const force = (0.65 + splashStrength * 0.9) * proximity * proximity
        swimmer.vx += dx / distance / aspect * force * delta * 2.1
        swimmer.vy += dy / distance * force * delta * 2.1
        swimmer.panic = Math.max(swimmer.panic, clamp(proximity * 0.8 + splashStrength * 0.42, 0, 1))
        swimmer.lastFrightenedAt = time
        if (swimmer.panic > 0.62 && Math.random() < delta * 5) addPanicBubble(swimmer)
      })
      activeHandZones.forEach((zone) => repelFromZone(swimmer, zone))
      avoidanceZones.forEach((zone) => repelFromZone(swimmer, zone))

      const nearestFood = foodPellets
        .filter((pellet) => pellet.life > 0)
        .map((pellet) => ({
          pellet,
          distance: Math.hypot((pellet.x - swimmer.x) * aspect, pellet.y - swimmer.y),
        }))
        .sort((a, b) => a.distance - b.distance)[0]
      if (nearestFood && swimmer.panic < 0.68) {
        const dx = (nearestFood.pellet.x - swimmer.x) * aspect
        const dy = nearestFood.pellet.y - swimmer.y
        const distance = Math.max(0.001, Math.hypot(dx, dy))
        const eatingDistance = swimmer.size / width * 0.48 + 0.012
        seekingFood = true
        if (distance < eatingDistance) {
          nearestFood.pellet.life = 0
          swimmer.vx *= 0.72
          swimmer.vy *= 0.72
          addPanicBubble(swimmer)
        } else {
          const foodPull = clamp(0.32 + distance * 0.65, 0.32, 0.72)
          swimmer.vx += dx / distance / aspect * foodPull * delta
          swimmer.vy += dy / distance * foodPull * delta
        }
      }

      const calmDuration = time - swimmer.lastFrightenedAt
      if (calmDuration > 1800 && !seekingFood) {
        const returnStrength = clamp((calmDuration - 1800) / 1800, 0, 1)
        const targetX = swimmer.homeX + Math.sin(time * 0.00022 + swimmer.phase) * 0.055
        const targetY = swimmer.homeY + Math.cos(time * 0.00018 + swimmer.phase) * 0.045
        swimmer.vx += (targetX - swimmer.x) * delta * (0.09 + returnStrength * 0.22)
        swimmer.vy += (targetY - swimmer.y) * delta * (0.09 + returnStrength * 0.22)
      }

      const marginX = clamp(swimmer.size / width * 1.08 + 0.025, 0.07, 0.22)
      const marginY = clamp(swimmer.size / height * 0.72 + 0.035, 0.085, 0.2)
      const steeringX = marginX + 0.085
      const steeringY = marginY + 0.075
      if (swimmer.x < steeringX) swimmer.vx += (steeringX - swimmer.x) * delta * 2.8
      if (swimmer.x > 1 - steeringX) swimmer.vx -= (swimmer.x - 1 + steeringX) * delta * 2.8
      if (swimmer.y < steeringY) swimmer.vy += (steeringY - swimmer.y) * delta * 2.8
      if (swimmer.y > 1 - steeringY) swimmer.vy -= (swimmer.y - 1 + steeringY) * delta * 2.8
      if (swimmer.x <= marginX && swimmer.vx < 0) swimmer.vx = Math.abs(swimmer.vx) * 0.72
      if (swimmer.x >= 1 - marginX && swimmer.vx > 0) swimmer.vx = -Math.abs(swimmer.vx) * 0.72
      if (swimmer.y <= marginY && swimmer.vy < 0) swimmer.vy = Math.abs(swimmer.vy) * 0.72
      if (swimmer.y >= 1 - marginY && swimmer.vy > 0) swimmer.vy = -Math.abs(swimmer.vy) * 0.72

      const speed = Math.hypot(swimmer.vx * aspect, swimmer.vy)
      const maximumSpeed = swimmer.cruiseSpeed * (1.35 + swimmer.panic * 14.5 + (seekingFood ? 1.9 : 0))
      if (speed > maximumSpeed) {
        swimmer.vx *= maximumSpeed / speed
        swimmer.vy *= maximumSpeed / speed
      }
      swimmer.x += swimmer.vx * delta
      swimmer.y += swimmer.vy * delta
      swimmer.x = clamp(swimmer.x, marginX, 1 - marginX)
      swimmer.y = clamp(swimmer.y, marginY, 1 - marginY)
      swimmer.heading = Math.atan2(swimmer.vy, swimmer.vx * aspect)
      swimmer.panic *= Math.pow(0.1, delta)
    })

    foodPellets = foodPellets.filter((pellet) => pellet.life > 0)

    bubbles.forEach((bubble) => {
      bubble.x += bubble.vx * delta
      bubble.y += bubble.vy * delta
      bubble.vx *= Math.pow(0.4, delta)
      bubble.life -= delta
    })
    bubbles = bubbles.filter((bubble) => bubble.life > 0 && bubble.y > -0.02)
    avoidanceZones.forEach((zone) => {
      zone.life -= delta
      zone.radius += delta * 0.035
    })
    avoidanceZones = avoidanceZones.filter((zone) => zone.life > 0)
  }

  const drawFish = (swimmer: Fish, time: number) => {
    const x = swimmer.x * width
    const y = swimmer.y * height
    const velocityAngle = Math.atan2(swimmer.vy * height, swimmer.vx * width)
    const panicStretch = 1 + swimmer.panic * 0.16
    const size = swimmer.size * (0.72 + swimmer.depth * 0.42)
    const tailSwingSpeed = 0.0036 + swimmer.cruiseSpeed * 0.045 + swimmer.panic * 0.009
    const tailSwing = Math.sin(time * tailSwingSpeed + swimmer.phase) * (0.15 + swimmer.panic * 0.18)
    context.save()
    context.translate(x, y)
    context.rotate(velocityAngle)
    context.scale(panicStretch, 1 / Math.sqrt(panicStretch))
    context.globalAlpha = 0.48 + swimmer.depth * 0.36
    context.shadowColor = 'rgba(2, 19, 25, 0.45)'
    context.shadowBlur = 5 + swimmer.depth * 5
    context.shadowOffsetY = 3

    context.save()
    context.translate(-size * 0.43, 0)
    context.rotate(tailSwing)
    context.fillStyle = swimmer.color
    context.beginPath()
    context.moveTo(0, 0)
    context.quadraticCurveTo(-size * 0.42, -size * 0.34, -size * 0.55, -size * 0.28)
    context.quadraticCurveTo(-size * 0.48, 0, -size * 0.56, size * 0.28)
    context.quadraticCurveTo(-size * 0.35, size * 0.32, 0, 0)
    context.fill()
    context.restore()

    context.fillStyle = swimmer.color
    context.beginPath()
    context.moveTo(-size * 0.42, 0)
    context.bezierCurveTo(-size * 0.25, -size * 0.38, size * 0.35, -size * 0.34, size * 0.54, 0)
    context.bezierCurveTo(size * 0.35, size * 0.34, -size * 0.25, size * 0.38, -size * 0.42, 0)
    context.fill()

    context.globalAlpha *= 0.42
    context.fillStyle = '#efffff'
    context.beginPath()
    context.ellipse(size * 0.08, -size * 0.1, size * 0.26, size * 0.075, -0.12, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 0.72 + swimmer.depth * 0.22
    context.shadowBlur = 0
    context.fillStyle = '#06242c'
    context.beginPath()
    context.arc(size * 0.36, -size * 0.075, Math.max(1.2, size * 0.038), 0, Math.PI * 2)
    context.fill()
    context.fillStyle = 'rgba(224, 252, 255, 0.9)'
    context.beginPath()
    context.arc(size * 0.37, -size * 0.086, Math.max(0.5, size * 0.014), 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  const drawBubbles = () => {
    context.save()
    context.strokeStyle = 'rgba(196, 246, 255, 0.72)'
    context.lineWidth = 0.8
    bubbles.forEach((bubble) => {
      context.globalAlpha = clamp(bubble.life, 0, 0.8)
      context.beginPath()
      context.arc(bubble.x * width, bubble.y * height, bubble.radius, 0, Math.PI * 2)
      context.stroke()
    })
    context.restore()
  }

  const drawFood = () => {
    context.save()
    context.fillStyle = '#ffd66f'
    context.shadowColor = 'rgba(255, 202, 75, 0.85)'
    context.shadowBlur = 7
    foodPellets.forEach((pellet) => {
      context.globalAlpha = clamp(pellet.life / 2, 0.38, 0.95)
      context.beginPath()
      context.arc(pellet.x * width, pellet.y * height, pellet.radius, 0, Math.PI * 2)
      context.fill()
    })
    context.restore()
  }

  const drawFeeder = (time: number) => {
    if (!feederVisible) return
    const size = clamp(width * 0.075, 82, 126)
    const grabbed = Boolean(grabbedBy)
    const bob = grabbed ? 0 : Math.sin(time * 0.0022) * 3
    context.save()
    context.translate(feederX * width, feederY * height + bob)
    context.rotate(feederAngle)
    context.shadowColor = grabbed ? 'rgba(123, 237, 255, 0.9)' : 'rgba(0, 12, 18, 0.5)'
    context.shadowBlur = grabbed ? 20 : 11
    context.shadowOffsetY = grabbed ? 0 : 6

    context.fillStyle = 'rgba(225, 248, 250, 0.76)'
    context.strokeStyle = grabbed ? '#a3f2ff' : 'rgba(226, 251, 255, 0.9)'
    context.lineWidth = 2
    context.beginPath()
    context.roundRect(-size * 0.4, -size * 0.45, size * 0.8, size * 0.94, size * 0.16)
    context.fill()
    context.stroke()

    context.save()
    context.beginPath()
    context.roundRect(-size * 0.35, -size * 0.38, size * 0.7, size * 0.79, size * 0.12)
    context.clip()
    context.fillStyle = 'rgba(218, 156, 58, 0.72)'
    context.fillRect(-size * 0.36, size * 0.02, size * 0.72, size * 0.4)
    context.fillStyle = '#e6ae54'
    for (let index = 0; index < 12; index += 1) {
      const pelletX = ((index * 29) % 67) / 67 * size * 0.6 - size * 0.3
      const pelletY = size * (0.08 + ((index * 17) % 29) / 90)
      context.beginPath()
      context.arc(pelletX, pelletY, Math.max(1.4, size * 0.025), 0, Math.PI * 2)
      context.fill()
    }
    context.restore()

    context.shadowBlur = 0
    context.fillStyle = '#54c4d8'
    context.beginPath()
    context.roundRect(-size * 0.46, -size * 0.55, size * 0.92, size * 0.18, size * 0.06)
    context.fill()
    context.fillStyle = 'rgba(5, 38, 47, 0.88)'
    context.fillRect(-size * 0.4, -size * 0.12, size * 0.8, size * 0.26)
    context.fillStyle = '#dffbff'
    context.font = `800 ${Math.max(8, size * 0.13)}px Nunito, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(grabbed ? 'SHAKE' : 'PINCH', 0, size * 0.012)
    context.restore()
  }

  const render = (touches: FingerTrack[], hands: HandPose[], time: number) => {
    resize()
    if (!lastTime) lastTime = time
    const delta = clamp((time - lastTime) / 1000, 0.001, 0.04)
    lastTime = time
    updateFeeder(hands, time, delta)
    updateFish(touches, time, delta)
    context.clearRect(0, 0, width, height)
    drawFood()
    fish.slice().sort((a, b) => a.depth - b.depth).forEach((swimmer) => drawFish(swimmer, time))
    drawBubbles()
    drawFeeder(time)
  }

  reset()
  return { render, resize, reset, toggleFeeder, getFoodState }
}

export const initWaterTouch = (root: HTMLElement) => {
  const video = root.querySelector<HTMLVideoElement>('#watertouch-camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#watertouch-canvas')!
  const fishCanvas = root.querySelector<HTMLCanvasElement>('#watertouch-fish-canvas')!
  const startPanel = root.querySelector<HTMLElement>('.watertouch-start')!
  const startMessage = root.querySelector<HTMLElement>('#watertouch-start-message')!
  const startButton = root.querySelector<HTMLButtonElement>('#watertouch-start-button')!
  const statusLabel = root.querySelector<HTMLElement>('#watertouch-status-label')!
  const statusText = root.querySelector<HTMLElement>('#watertouch-status-text')!
  const handCount = root.querySelector<HTMLElement>('#watertouch-hand-count')!
  const fingerCount = root.querySelector<HTMLElement>('#watertouch-finger-count')!
  const renderer = createWaterRenderer(canvas)
  const fishSchool = createFishSchool(fishCanvas)

  let active = false
  let starting = false
  let stream: MediaStream | null = null
  let handLandmarker: HandLandmarker | null = null
  let handLandmarkerPromise: Promise<HandLandmarker> | null = null
  let latestResult: HandLandmarkerResult | null = null
  let animationFrame = 0
  let lastVideoTime = -1
  let lastDetectionTime = 0
  let previousDetectedHands = 0
  let lastSplashTime = 0
  let audioContext: AudioContext | null = null
  let splashBuffer: AudioBuffer | null = null
  let splashBufferPromise: Promise<AudioBuffer | null> | null = null
  let pendingSplash: { strength: number; x: number } | null = null
  const playingSplashes = new Set<AudioBufferSourceNode>()
  const tracks = new Map<string, FingerTrack>()
  const handPoses = new Map<string, HandPose>()
  const gestureMemory = new Map<string, { wasClosed: boolean; wasOpen: boolean; armedAt: number; cooldownUntil: number }>()
  let feederMessage = ''
  let feederMessageUntil = 0
  let suppressWaterAudioUntil = 0

  const setStatus = (label: string, text: string) => {
    statusLabel.textContent = label
    statusText.textContent = text
  }

  const prepareAudio = async () => {
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (error) {
        console.warn('WaterTouch 오디오 활성화가 지연되었습니다.', error)
      }
    }
    if (splashBuffer) return splashBuffer
    if (splashBufferPromise) return splashBufferPromise
    splashBufferPromise = fetch(SPLASH_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Splash audio request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .then((data) => audioContext!.decodeAudioData(data))
      .then((buffer) => {
        splashBuffer = buffer
        if (pendingSplash && active && stream) {
          const pending = pendingSplash
          pendingSplash = null
          playSplash(pending.strength, pending.x)
        }
        return buffer
      })
      .catch((error) => {
        console.warn('WaterTouch 물소리를 불러오지 못했습니다.', error)
        splashBufferPromise = null
        return null
      })
    return splashBufferPromise
  }

  const playSplash = (strength: number, x: number) => {
    if (!audioContext || !splashBuffer) {
      if (!pendingSplash || strength > pendingSplash.strength) pendingSplash = { strength, x }
      return
    }
    if (audioContext.state !== 'running') {
      void audioContext.resume().then(() => playSplash(strength, x)).catch(() => {})
      return
    }
    const now = audioContext.currentTime
    const source = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    const panner = audioContext.createStereoPanner()
    const normalizedStrength = clamp(strength, 0, 1)
    source.buffer = splashBuffer
    source.playbackRate.value = 0.88 + Math.random() * 0.2 + normalizedStrength * 0.08
    panner.pan.value = clamp((x - 0.5) * 1.65, -0.82, 0.82)
    const volume = 0.11 + normalizedStrength * 0.21
    const audibleDuration = Math.min(splashBuffer.duration, 0.75 + normalizedStrength * 0.7)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025)
    gain.gain.setValueAtTime(volume, now + Math.max(0.08, audibleDuration - 0.18))
    gain.gain.exponentialRampToValueAtTime(0.001, now + audibleDuration)
    source.connect(gain).connect(panner).connect(audioContext.destination)
    playingSplashes.add(source)
    source.addEventListener('ended', () => playingSplashes.delete(source), { once: true })
    source.start(now)
    source.stop(now + audibleDuration + 0.03)
  }

  const createTracker = async () => {
    if (handLandmarker) return handLandmarker
    if (handLandmarkerPromise) return handLandmarkerPromise
    handLandmarkerPromise = (async () => {
      setStatus('LOADING AI', '양손의 열 손가락을 인식하는 모델을 준비하고 있어요.')
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
    const screenAspect = Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1)
    const videoAspect = Math.max(video.videoWidth, 1) / Math.max(video.videoHeight, 1)
    if (videoAspect > screenAspect) {
      const visibleWidth = screenAspect / videoAspect
      const cropX = (1 - visibleWidth) / 2
      return { x: 1 - (landmark.x - cropX) / visibleWidth, y: 1 - landmark.y }
    }
    const visibleHeight = videoAspect / screenAspect
    const cropY = (1 - visibleHeight) / 2
    return { x: 1 - landmark.x, y: 1 - (landmark.y - cropY) / visibleHeight }
  }

  const processFeederGesture = (pose: HandPose, now: number) => {
    const memory = gestureMemory.get(pose.key) ?? { wasClosed: false, wasOpen: false, armedAt: 0, cooldownUntil: 0 }
    if (pose.closed && !memory.wasClosed && now >= memory.cooldownUntil) memory.armedAt = now
    if (pose.open && !memory.wasOpen && memory.armedAt > 0 && now - memory.armedAt < 2200 && now >= memory.cooldownUntil) {
      const visible = fishSchool.toggleFeeder({ x: pose.x, y: pose.y })
      feederMessage = visible ? '먹이통이 나타났어요. 통 가까이에서 엄지와 검지를 집어 잡아 보세요.' : '먹이통을 물속에서 치웠어요.'
      feederMessageUntil = now + 2200
      suppressWaterAudioUntil = now + 1200
      pendingSplash = null
      memory.armedAt = 0
      memory.cooldownUntil = now + 1100
    }
    if (memory.armedAt > 0 && now - memory.armedAt >= 2200) memory.armedAt = 0
    memory.wasClosed = pose.closed
    memory.wasOpen = pose.open
    gestureMemory.set(pose.key, memory)
  }

  const updateTracks = (result: HandLandmarkerResult, now: number) => {
    const elapsed = Math.max((now - lastDetectionTime) / 1000, 1 / 60)
    lastDetectionTime = now
    const seen = new Set<string>()
    result.landmarks.forEach((landmarks, handIndex) => {
      const side = result.handedness[handIndex]?.[0]?.categoryName ?? `Hand${handIndex}`
      const screenLandmarks = landmarks.map(landmarkToScreen)
      const palmIndices = [0, 5, 9, 13, 17]
      const center = palmIndices.reduce((sum, landmarkIndex) => ({
        x: sum.x + screenLandmarks[landmarkIndex].x / palmIndices.length,
        y: sum.y + screenLandmarks[landmarkIndex].y / palmIndices.length,
      }), { x: 0, y: 0 })
      const rawDistance = (first: number, second: number) => Math.hypot(
        landmarks[first].x - landmarks[second].x,
        landmarks[first].y - landmarks[second].y,
      )
      const palmWidth = Math.max(rawDistance(5, 17), 0.001)
      const foldedCount = [[8, 6], [12, 10], [16, 14], [20, 18]]
        .filter(([tip, pip]) => rawDistance(tip, 0) < rawDistance(pip, 0) * 1.12).length
      const extendedCount = [[8, 6], [12, 10], [16, 14], [20, 18]]
        .filter(([tip, pip]) => rawDistance(tip, 0) > rawDistance(pip, 0) * 1.16).length
      const fingertipSpread = rawDistance(8, 20)
      const closed = foldedCount >= 3 && fingertipSpread < palmWidth * 1.5
      const open = extendedCount === 4 && fingertipSpread > palmWidth * 1.45 && rawDistance(4, 9) > palmWidth * 0.78
      const previousPose = handPoses.get(side)
      const pinchRatio = rawDistance(4, 8) / palmWidth
      const pinch = pinchRatio < (previousPose?.pinch ? 0.9 : 0.68)
      const rawPinchX = (screenLandmarks[4].x + screenLandmarks[8].x) / 2
      const rawPinchY = (screenLandmarks[4].y + screenLandmarks[8].y) / 2
      const poseSpeed = previousPose
        ? Math.hypot(center.x - previousPose.x, center.y - previousPose.y) / elapsed
        : 0
      const pose: HandPose = {
        key: side,
        x: previousPose ? previousPose.x + (center.x - previousPose.x) * 0.62 : center.x,
        y: previousPose ? previousPose.y + (center.y - previousPose.y) * 0.62 : center.y,
        pinchX: previousPose ? previousPose.pinchX + (rawPinchX - previousPose.pinchX) * 0.76 : rawPinchX,
        pinchY: previousPose ? previousPose.pinchY + (rawPinchY - previousPose.pinchY) * 0.76 : rawPinchY,
        speed: previousPose ? previousPose.speed + (poseSpeed - previousPose.speed) * 0.5 : 0,
        pinch,
        closed,
        open,
        lastSeen: now,
      }
      handPoses.set(side, pose)
      processFeederGesture(pose, now)
      FINGERTIP_INDICES.forEach((landmarkIndex, fingerIndex) => {
        const point = screenLandmarks[landmarkIndex]
        const key = `${side}-${fingerIndex}`
        seen.add(key)
        const existing = tracks.get(key)
        if (!existing) {
          tracks.set(key, {
            key,
            x: point.x,
            y: point.y,
            previousX: point.x,
            previousY: point.y,
            speed: 0,
            lastSeen: now,
            fingerIndex,
          })
          return
        }
        const smoothing = 0.58
        const nextX = existing.x + (point.x - existing.x) * smoothing
        const nextY = existing.y + (point.y - existing.y) * smoothing
        const instantSpeed = Math.hypot(nextX - existing.x, nextY - existing.y) / elapsed
        existing.x = nextX
        existing.y = nextY
        existing.speed += (instantSpeed - existing.speed) * 0.45
        existing.lastSeen = now
      })
    })
    tracks.forEach((track, key) => {
      if (!seen.has(key) && now - track.lastSeen > 180) tracks.delete(key)
    })
    handPoses.forEach((pose, key) => {
      if (now - pose.lastSeen > 220) handPoses.delete(key)
    })
  }

  const stopCamera = () => {
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    video.pause()
    video.srcObject = null
    latestResult = null
    tracks.clear()
    handPoses.clear()
    gestureMemory.clear()
    feederMessage = ''
    feederMessageUntil = 0
    suppressWaterAudioUntil = 0
    previousDetectedHands = 0
    lastSplashTime = 0
    pendingSplash = null
    playingSplashes.forEach((source) => {
      try {
        source.stop()
      } catch {
        // The source may already have finished between frames.
      }
    })
    playingSplashes.clear()
    if (audioContext?.state === 'running') void audioContext.suspend()
    root.classList.remove('camera-ready')
    handCount.textContent = '0'
    fingerCount.textContent = '0'
    renderer.reset()
    fishSchool.reset()
  }

  const renderFrame = (time: number) => {
    if (!active || !stream) return
    if (handLandmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      try {
        latestResult = handLandmarker.detectForVideo(video, time)
        updateTracks(latestResult, time)
      } catch (error) {
        console.warn('WaterTouch 손 추적 프레임을 처리하지 못했습니다.', error)
      }
    }

    const visibleTracks = Array.from(tracks.values()).filter((track) => time - track.lastSeen < 220)
    const visibleHands = Array.from(handPoses.values()).filter((pose) => time - pose.lastSeen < 220)
    const detectedHands = latestResult?.landmarks.length ?? 0
    const foodState = fishSchool.getFoodState()
    const waterSoundAllowed = foodState === 'hidden' && time >= suppressWaterAudioUntil
    if (waterSoundAllowed && detectedHands > previousDetectedHands && visibleTracks.length) {
      const centerX = visibleTracks.reduce((sum, track) => sum + track.x, 0) / visibleTracks.length
      playSplash(0.62 + detectedHands * 0.12, centerX)
      lastSplashTime = time
    } else if (waterSoundAllowed && visibleTracks.length) {
      const fastest = visibleTracks.reduce((currentFastest, track) => track.speed > currentFastest.speed ? track : currentFastest)
      const strength = clamp((fastest.speed - 0.08) / 0.72, 0, 1)
      const cooldown = 440 - strength * 245
      if (strength > 0.035 && time - lastSplashTime > cooldown) {
        playSplash(strength, fastest.x)
        lastSplashTime = time
      }
    }
    previousDetectedHands = detectedHands
    handCount.textContent = String(detectedHands)
    fingerCount.textContent = String(visibleTracks.length)
    if (time < feederMessageUntil) {
      setStatus(foodState === 'hidden' ? 'FEEDER HIDDEN' : 'FEEDER READY', feederMessage)
    } else if (foodState === 'feeding') {
      setStatus('SPRINKLING FOOD', '먹이통을 흔들어 먹이를 뿌리면 물고기들이 모여들어요.')
    } else if (foodState === 'ready') {
      setStatus('PINCH TO GRAB', '먹이통 가까이에서 엄지와 검지를 집어 통을 잡아 보세요.')
    } else if (detectedHands > 0) {
      const fastestSpeed = Math.max(...visibleTracks.map((track) => track.speed), 0)
      if (fastestSpeed > 0.18) {
        setStatus('FISH SCATTER', '물고기들이 휘저은 물살과 손길을 피해 달아나고 있어요.')
      } else {
        setStatus('WATER CONTACT', visibleTracks.length >= 10
          ? '양손의 열 손가락이 모두 물결을 만들고 있어요.'
          : `${visibleTracks.length}개의 손끝을 따라 수면이 움직이고 있어요.`)
      }
    } else {
      setStatus('SHOW YOUR HANDS', '손바닥이 카메라를 향하도록 천천히 들어 주세요.')
    }
    renderer.render(video, visibleTracks, time)
    fishSchool.render(visibleTracks, visibleHands, time)
    animationFrame = requestAnimationFrame(renderFrame)
  }

  const startCamera = async () => {
    if (starting || stream) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('CAMERA ERROR', '이 브라우저에서는 카메라를 사용할 수 없어요.')
      startMessage.textContent = '카메라를 지원하는 최신 브라우저에서 다시 시도해 주세요.'
      return
    }
    starting = true
    const audioReady = prepareAudio()
    startButton.disabled = true
    startButton.textContent = '수면 준비 중…'
    startMessage.textContent = '카메라 권한을 요청하고 있어요…'
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
      renderer.resize()
      renderer.reset()
      fishSchool.resize()
      fishSchool.reset()
      startPanel.hidden = true
      root.classList.add('camera-ready')
      setStatus('SURFACE READY', '손가락 끝으로 화면의 수면을 천천히 저어 보세요.')
      lastVideoTime = -1
      lastDetectionTime = performance.now()
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(renderFrame)
    } catch (error) {
      console.error('WaterTouch 카메라 또는 손 추적 초기화에 실패했습니다.', error)
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
      startButton.textContent = '카메라 시작'
    }
  }

  startButton.addEventListener('click', () => void startCamera())
  window.addEventListener('resize', renderer.resize)
  window.addEventListener('resize', fishSchool.resize)

  return {
    setActive(nextActive: boolean) {
      active = nextActive
      if (active) {
        renderer.resize()
        renderer.reset()
        fishSchool.resize()
        fishSchool.reset()
        startPanel.hidden = false
        startMessage.innerHTML = '카메라는 손끝 좌표를 계산하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.'
        setStatus('CAMERA READY', '카메라를 시작하고 손가락으로 수면을 만져 보세요.')
      } else {
        stopCamera()
      }
    },
  }
}
