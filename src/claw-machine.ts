import * as THREE from 'three'

type MachineState = 'aiming' | 'lowering' | 'readyToGrab' | 'closing' | 'lifting' | 'carrying' | 'dropping' | 'returning'
type PlushKind = 'bear' | 'bunny' | 'chick' | 'cat' | 'panda' | 'octopus'

type Plush = {
  group: THREE.Group
  name: string
  won: boolean
  fallVelocity: number | null
  exitMode: boolean
  exitProgress: number
  exitFrom: THREE.Vector3
}

const FLOOR_Y = 0.78
const CLAW_HOME_Y = 5.12
const CLAW_LOW_Y = 1.72
const CHUTE_X = -2.5
const CHUTE_Z = 2.08

const clamp = THREE.MathUtils.clamp

const createPhysicalMaterial = (color: THREE.ColorRepresentation, metalness = 0, roughness = 0.68) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: metalness > 0 ? 0.78 : 0.15,
    clearcoatRoughness: 0.3,
  })

const createPlushMaterial = (color: THREE.ColorRepresentation) => {
  const base = new THREE.Color(color)
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.96,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.88,
    sheenColor: base.clone().offsetHSL(0, -0.08, 0.2),
  })
}

const makeMesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

const addSphere = (
  group: THREE.Group,
  radius: number,
  position: [number, number, number],
  material: THREE.Material,
  scale: [number, number, number] = [1, 1, 1],
) => {
  const part = makeMesh(new THREE.SphereGeometry(radius, 28, 20), material)
  part.position.set(...position)
  part.scale.set(...scale)
  group.add(part)
  return part
}

const addCapsule = (
  group: THREE.Group,
  radius: number,
  length: number,
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const part = makeMesh(new THREE.CapsuleGeometry(radius, length, 8, 16), material)
  part.position.set(...position)
  part.rotation.set(...rotation)
  group.add(part)
  return part
}

const addFace = (group: THREE.Group, eyeY: number, eyeX: number, eyeZ: number, noseY: number, noseZ: number) => {
  const eyeMaterial = createPhysicalMaterial('#21191b', 0, 0.36)
  const shineMaterial = createPhysicalMaterial('#ffffff', 0, 0.25)
  const noseMaterial = createPhysicalMaterial('#3a252a', 0, 0.48)

  ;[-1, 1].forEach((side) => {
    addSphere(group, 0.048, [eyeX * side, eyeY, eyeZ], eyeMaterial, [1, 1.08, 0.58])
    addSphere(group, 0.012, [eyeX * side - 0.012, eyeY + 0.016, eyeZ + 0.026], shineMaterial)
  })
  addSphere(group, 0.055, [0, noseY, noseZ], noseMaterial, [1.05, 0.78, 0.62])
}

const createPlush = (kind: PlushKind, color: THREE.ColorRepresentation, accent: THREE.ColorRepresentation, name: string) => {
  const group = new THREE.Group()
  const fabric = createPlushMaterial(color)
  const detail = createPlushMaterial(accent)
  const dark = createPhysicalMaterial('#292023', 0, 0.55)

  if (kind === 'bear' || kind === 'panda') {
    const bodyMaterial = kind === 'panda' ? createPlushMaterial('#f4efe8') : fabric
    const patchMaterial = kind === 'panda' ? createPlushMaterial('#29282c') : fabric
    addSphere(group, 0.48, [0, 0.48, 0], bodyMaterial, [0.88, 1.05, 0.76])
    addSphere(group, 0.41, [0, 1.13, 0.03], bodyMaterial, [1, 0.94, 0.9])
    addSphere(group, 0.16, [-0.3, 1.43, 0], patchMaterial)
    addSphere(group, 0.16, [0.3, 1.43, 0], patchMaterial)
    addCapsule(group, 0.11, 0.3, [-0.46, 0.55, 0], patchMaterial, [0, 0, -0.58])
    addCapsule(group, 0.11, 0.3, [0.46, 0.55, 0], patchMaterial, [0, 0, 0.58])
    addSphere(group, 0.13, [-0.23, 0.15, 0.04], patchMaterial, [1, 0.72, 1])
    addSphere(group, 0.13, [0.23, 0.15, 0.04], patchMaterial, [1, 0.72, 1])
    if (kind === 'panda') {
      addSphere(group, 0.12, [-0.15, 1.17, 0.34], patchMaterial, [1.3, 0.8, 0.38]).rotation.z = -0.35
      addSphere(group, 0.12, [0.15, 1.17, 0.34], patchMaterial, [1.3, 0.8, 0.38]).rotation.z = 0.35
    }
    addSphere(group, 0.2, [0, 1.02, 0.34], detail, [1, 0.72, 0.46])
    addFace(group, 1.19, 0.145, 0.385, 1.06, 0.46)
  }

  if (kind === 'bunny') {
    addSphere(group, 0.45, [0, 0.47, 0], fabric, [0.86, 1.08, 0.76])
    addSphere(group, 0.38, [0, 1.12, 0.03], fabric, [0.96, 1, 0.88])
    addCapsule(group, 0.13, 0.52, [-0.19, 1.65, -0.02], fabric, [0, 0, -0.12])
    addCapsule(group, 0.13, 0.52, [0.19, 1.65, -0.02], fabric, [0, 0, 0.12])
    addCapsule(group, 0.065, 0.36, [-0.19, 1.66, 0.09], detail, [0, 0, -0.12])
    addCapsule(group, 0.065, 0.36, [0.19, 1.66, 0.09], detail, [0, 0, 0.12])
    addCapsule(group, 0.1, 0.28, [-0.41, 0.5, 0], fabric, [0, 0, -0.58])
    addCapsule(group, 0.1, 0.28, [0.41, 0.5, 0], fabric, [0, 0, 0.58])
    addSphere(group, 0.17, [0, 1.02, 0.34], detail, [0.95, 0.7, 0.42])
    addFace(group, 1.18, 0.135, 0.36, 1.05, 0.43)
  }

  if (kind === 'chick') {
    addSphere(group, 0.53, [0, 0.53, 0], fabric, [0.92, 1.05, 0.84])
    addSphere(group, 0.4, [0, 1.16, 0.03], fabric, [1, 0.94, 0.92])
    addSphere(group, 0.24, [-0.45, 0.57, 0], fabric, [0.58, 1, 0.42]).rotation.z = -0.25
    addSphere(group, 0.24, [0.45, 0.57, 0], fabric, [0.58, 1, 0.42]).rotation.z = 0.25
    const beak = makeMesh(new THREE.ConeGeometry(0.12, 0.24, 4), detail)
    beak.position.set(0, 1.09, 0.45)
    beak.rotation.x = Math.PI / 2
    beak.rotation.y = Math.PI / 4
    group.add(beak)
    addFace(group, 1.22, 0.14, 0.39, 1.08, 0.43)
    addSphere(group, 0.07, [0, 1.08, 0.46], detail, [1.2, 0.72, 0.7])
  }

  if (kind === 'cat') {
    addSphere(group, 0.48, [0, 0.48, 0], fabric, [0.86, 1.08, 0.75])
    addSphere(group, 0.41, [0, 1.14, 0.02], fabric, [1, 0.94, 0.86])
    ;[-1, 1].forEach((side) => {
      const ear = makeMesh(new THREE.ConeGeometry(0.19, 0.45, 4), fabric)
      ear.position.set(side * 0.27, 1.52, -0.02)
      ear.rotation.y = Math.PI / 4
      ear.rotation.z = side * -0.12
      group.add(ear)
    })
    addCapsule(group, 0.09, 0.58, [0.48, 0.43, -0.12], fabric, [0.1, 0, 0.78])
    addSphere(group, 0.19, [0, 1.03, 0.36], detail, [1, 0.68, 0.43])
    addFace(group, 1.18, 0.15, 0.39, 1.08, 0.45)
  }

  if (kind === 'octopus') {
    addSphere(group, 0.54, [0, 0.82, 0], fabric, [1, 1.05, 0.88])
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2
      addCapsule(
        group,
        0.095,
        0.38,
        [Math.cos(angle) * 0.4, 0.25, Math.sin(angle) * 0.35],
        fabric,
        [Math.sin(angle) * 0.65, 0, -Math.cos(angle) * 0.65],
      )
    }
    addFace(group, 0.89, 0.17, 0.49, 0.75, 0.51)
    addSphere(group, 0.06, [0, 0.75, 0.52], dark, [0.7, 1, 0.45])
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  const plush: Plush = {
    group,
    name,
    won: false,
    fallVelocity: null,
    exitMode: false,
    exitProgress: -1,
    exitFrom: new THREE.Vector3(),
  }
  return plush
}

export const initClawMachine = (root: HTMLElement) => {
  const canvas = root.querySelector<HTMLCanvasElement>('#claw-canvas')!
  const statusLabel = root.querySelector<HTMLElement>('#claw-state-label')!
  const statusText = root.querySelector<HTMLElement>('#claw-status-text')!
  const prizeCount = root.querySelector<HTMLElement>('#claw-prize-count')!
  const spaceButton = root.querySelector<HTMLButtonElement>('#claw-space-button')!
  const spaceButtonLabel = spaceButton.querySelector<HTMLElement>('strong')!
  const directionButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-claw-key]'))

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#21131f')
  scene.fog = new THREE.Fog('#21131f', 13, 26)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  camera.position.set(8.4, 6.4, 10.4)
  camera.lookAt(0, 2.75, 0)

  scene.add(new THREE.HemisphereLight('#fff2e5', '#311a2d', 2.2))
  const keyLight = new THREE.DirectionalLight('#fff0dd', 4.2)
  keyLight.position.set(6, 10, 7)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.left = -8
  keyLight.shadow.camera.right = 8
  keyLight.shadow.camera.top = 9
  keyLight.shadow.camera.bottom = -3
  scene.add(keyLight)

  const pinkLight = new THREE.PointLight('#ff73b8', 18, 13, 2)
  pinkLight.position.set(-4, 4.5, 3.5)
  scene.add(pinkLight)
  const blueLight = new THREE.PointLight('#70cfff', 11, 12, 2)
  blueLight.position.set(4, 5, -2)
  scene.add(blueLight)

  const ground = makeMesh(new THREE.PlaneGeometry(28, 24), createPhysicalMaterial('#6f465c', 0, 0.82))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  scene.add(ground)

  const machine = new THREE.Group()
  machine.rotation.y = -0.05
  scene.add(machine)

  const pinkMetal = createPhysicalMaterial('#dc4f8e', 0.52, 0.3)
  const roseMetal = createPhysicalMaterial('#a82f69', 0.48, 0.34)
  const cream = createPhysicalMaterial('#f7e9df', 0.06, 0.45)
  const darkPanel = createPhysicalMaterial('#251624', 0.24, 0.36)
  const chrome = createPhysicalMaterial('#d8dbe2', 0.95, 0.16)
  const floorMaterial = createPhysicalMaterial('#f0c8d7', 0.02, 0.72)
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#d6f4ff',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.12,
    transmission: 0.36,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const addBox = (
    width: number,
    height: number,
    depth: number,
    position: [number, number, number],
    material: THREE.Material,
    parent: THREE.Object3D = machine,
  ) => {
    const part = makeMesh(new THREE.BoxGeometry(width, height, depth), material)
    part.position.set(...position)
    parent.add(part)
    return part
  }

  addBox(7.2, 0.72, 5.7, [0, 0.36, 0], roseMetal)
  addBox(6.62, 0.18, 5.12, [0, FLOOR_Y - 0.08, 0], floorMaterial)
  addBox(7.2, 0.78, 5.7, [0, 5.88, 0], pinkMetal)
  addBox(5.2, 0.38, 0.14, [0.55, 5.88, 2.9], cream)
  addBox(1.28, 0.5, 0.14, [-2.5, 5.88, 2.9], darkPanel)

  ;[-3.42, 3.42].forEach((x) => {
    ;[-2.66, 2.66].forEach((z) => addBox(0.2, 5.18, 0.2, [x, 3.28, z], pinkMetal))
  })

  addBox(6.65, 4.75, 0.04, [0, 3.25, -2.65], glass)
  addBox(0.04, 4.75, 5.12, [-3.4, 3.25, 0], glass)
  addBox(0.04, 4.75, 5.12, [3.4, 3.25, 0], glass)
  const frontGlass = addBox(6.65, 4.75, 0.035, [0, 3.25, 2.65], glass)
  frontGlass.renderOrder = 4

  addBox(1.55, 0.55, 0.12, [CHUTE_X, 0.42, 2.91], darkPanel)
  addBox(1.78, 0.12, 0.2, [CHUTE_X, 0.75, 2.9], chrome)
  addBox(0.12, 0.7, 0.22, [CHUTE_X - 0.88, 0.46, 2.9], chrome)
  addBox(0.12, 0.7, 0.22, [CHUTE_X + 0.88, 0.46, 2.9], chrome)

  const railMaterial = createPhysicalMaterial('#bbbfc8', 0.94, 0.18)
  addBox(6.1, 0.08, 0.1, [0, 5.37, -1.75], railMaterial)
  addBox(6.1, 0.08, 0.1, [0, 5.37, 1.75], railMaterial)
  addBox(0.1, 0.08, 3.5, [0, 5.42, 0], railMaterial)

  for (let index = 0; index < 11; index += 1) {
    const bulb = makeMesh(new THREE.SphereGeometry(0.055, 12, 8), createPhysicalMaterial(index % 2 ? '#ffe88a' : '#ff9dcc', 0.08, 0.25))
    bulb.position.set(-2.3 + index * 0.45, 5.88, 3)
    machine.add(bulb)
  }

  const plushSpecs: Array<[PlushKind, string, string, string, number, number]> = [
    ['bear', '#dc7b9e', '#f2c5b8', '장미 곰', -2.05, -1.35],
    ['bunny', '#b994d6', '#efb6ce', '라벤더 토끼', -0.65, -1.55],
    ['chick', '#f2bd4e', '#ec7b58', '노란 병아리', 0.85, -1.32],
    ['cat', '#76b9ae', '#e9c0ad', '민트 고양이', 2.12, -1.42],
    ['panda', '#f0ede8', '#ddd3c4', '몽실 판다', -1.45, 0.45],
    ['octopus', '#df668f', '#f3b5c8', '꽃문어', 0.12, 0.35],
    ['bear', '#e89065', '#f1ccb1', '살구 곰', 1.75, 0.48],
  ]

  const plushes = plushSpecs.map(([kind, color, accent, name, x, z], index) => {
    const plush = createPlush(kind, color, accent, name)
    plush.group.position.set(x, FLOOR_Y, z)
    plush.group.rotation.y = (index % 2 ? -1 : 1) * (0.08 + (index % 3) * 0.05)
    machine.add(plush.group)
    return plush
  })

  const carriage = new THREE.Group()
  machine.add(carriage)
  addBox(0.62, 0.22, 0.66, [0, 5.45, 0], roseMetal, carriage)
  const wheelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 18)
  ;[-0.22, 0.22].forEach((x) => {
    ;[-0.25, 0.25].forEach((z) => {
      const wheel = makeMesh(wheelGeometry, darkPanel)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 5.34, z)
      carriage.add(wheel)
    })
  })

  const cable = makeMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 10), darkPanel)
  carriage.add(cable)

  const clawRoot = new THREE.Group()
  carriage.add(clawRoot)
  const clawHead = makeMesh(new THREE.SphereGeometry(0.24, 24, 18), chrome)
  clawHead.scale.y = 0.72
  clawRoot.add(clawHead)
  const collar = makeMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.24, 20), roseMetal)
  collar.position.y = 0.22
  clawRoot.add(collar)

  const prongs: THREE.Group[] = []
  for (let index = 0; index < 3; index += 1) {
    const prong = new THREE.Group()
    prong.rotation.y = (index / 3) * Math.PI * 2
    const upper = makeMesh(new THREE.CapsuleGeometry(0.045, 0.55, 6, 12), chrome)
    upper.position.y = -0.37
    prong.add(upper)
    const tip = makeMesh(new THREE.CapsuleGeometry(0.052, 0.3, 6, 12), chrome)
    tip.position.set(0.11, -0.71, 0)
    tip.rotation.z = -0.6
    prong.add(tip)
    clawRoot.add(prong)
    prongs.push(prong)
  }

  const targetRingMaterial = new THREE.MeshBasicMaterial({ color: '#fff0a3', transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.43, 48), targetRingMaterial)
  targetRing.rotation.x = -Math.PI / 2
  targetRing.position.y = FLOOR_Y + 0.015
  machine.add(targetRing)

  let active = false
  let state: MachineState = 'aiming'
  let stateTime = 0
  let clawX = 0
  let clawZ = 0
  let clawY = CLAW_HOME_Y
  let closure = 0
  let heldPlush: Plush | null = null
  let heldStable = true
  let unstableDropAt = 0.5
  let dropReleased = false
  let wonCount = 0
  let lastFrame = performance.now()
  const pressedKeys = new Set<string>()

  const setStatus = (label: string, text: string) => {
    statusLabel.textContent = label
    statusText.textContent = text
  }

  const updateControls = () => {
    const canMove = state === 'aiming'
    directionButtons.forEach((button) => { button.disabled = !canMove })
    spaceButton.disabled = state !== 'aiming' && state !== 'readyToGrab'
    spaceButtonLabel.textContent = state === 'readyToGrab' ? '집기' : state === 'aiming' ? '내리기' : '작동 중'
  }

  const changeState = (nextState: MachineState) => {
    state = nextState
    stateTime = 0
    updateControls()
  }

  const attemptGrab = () => {
    const candidates = plushes
      .filter((plush) => !plush.won && plush.fallVelocity === null && plush.exitProgress < 0)
      .map((plush) => ({ plush, distance: Math.hypot(plush.group.position.x - clawX, plush.group.position.z - clawZ) }))
      .sort((a, b) => a.distance - b.distance)

    const nearest = candidates[0]
    if (!nearest || nearest.distance > 0.92) {
      heldPlush = null
      setStatus('MISS', '아쉽게도 집게가 인형을 놓쳤어요')
      return
    }

    heldPlush = nearest.plush
    const stableChance = clamp(0.9 - nearest.distance * 0.42, 0.48, 0.88)
    heldStable = Math.random() < stableChance
    unstableDropAt = 0.22 + Math.random() * 0.62
    setStatus(heldStable ? 'NICE GRAB' : 'WOBBLY', heldStable ? `${heldPlush.name}을(를) 안정적으로 잡았어요!` : `${heldPlush.name}이(가) 아슬아슬하게 매달렸어요`)
  }

  const releaseUnstablePlush = () => {
    if (!heldPlush) return
    heldPlush.fallVelocity = 0
    heldPlush.exitMode = false
    heldPlush = null
    setStatus('DROPPED', '인형이 흔들리다가 떨어졌어요')
  }

  const releasePrizeAtExit = () => {
    if (!heldPlush) return
    heldPlush.fallVelocity = 0
    heldPlush.exitMode = true
    heldPlush = null
    setStatus('PRIZE!', '인형이 출구로 내려가고 있어요')
  }

  const moveClawTo = (targetX: number, targetZ: number, speed: number, delta: number) => {
    const differenceX = targetX - clawX
    const differenceZ = targetZ - clawZ
    const distance = Math.hypot(differenceX, differenceZ)
    if (distance < 0.025) {
      clawX = targetX
      clawZ = targetZ
      return true
    }
    const step = Math.min(distance, speed * delta)
    clawX += (differenceX / distance) * step
    clawZ += (differenceZ / distance) * step
    return false
  }

  const runSpaceAction = () => {
    if (!active) return
    if (state === 'aiming') {
      pressedKeys.clear()
      changeState('lowering')
      setStatus('LOWERING', '집게가 선택한 위치로 내려가고 있어요')
      return
    }
    if (state === 'readyToGrab') {
      changeState('closing')
      setStatus('GRABBING', '집게를 접고 있어요…')
    }
  }

  const updatePlushPhysics = (delta: number) => {
    plushes.forEach((plush) => {
      if (plush.fallVelocity !== null) {
        plush.fallVelocity -= 7.8 * delta
        plush.group.position.y += plush.fallVelocity * delta
        plush.group.rotation.z += delta * 1.35
        if (plush.group.position.y <= FLOOR_Y) {
          plush.group.position.y = FLOOR_Y
          plush.fallVelocity = null
          plush.group.rotation.z *= 0.35
          if (plush.exitMode) {
            plush.exitProgress = 0
            plush.exitFrom.copy(plush.group.position)
          }
        }
      }

      if (plush.exitProgress >= 0 && plush.exitProgress < 1) {
        plush.exitProgress = Math.min(1, plush.exitProgress + delta / 1.15)
        const eased = 1 - (1 - plush.exitProgress) ** 3
        plush.group.position.x = THREE.MathUtils.lerp(plush.exitFrom.x, CHUTE_X, eased)
        plush.group.position.z = THREE.MathUtils.lerp(plush.exitFrom.z, 3.55, eased)
        plush.group.position.y = THREE.MathUtils.lerp(FLOOR_Y, 0.38, eased)
        plush.group.rotation.y += delta * 1.8
        if (plush.exitProgress === 1 && !plush.won) {
          plush.won = true
          wonCount += 1
          prizeCount.textContent = String(wonCount)
          setStatus('YOU GOT IT!', `${plush.name} 획득!`)
        }
      }
    })
  }

  const updateMachine = (delta: number, now: number) => {
    stateTime += delta

    if (state === 'aiming') {
      let horizontal = 0
      let depth = 0
      if (pressedKeys.has('ArrowLeft')) horizontal -= 1
      if (pressedKeys.has('ArrowRight')) horizontal += 1
      if (pressedKeys.has('ArrowUp')) depth -= 1
      if (pressedKeys.has('ArrowDown')) depth += 1
      const length = Math.hypot(horizontal, depth) || 1
      clawX = clamp(clawX + (horizontal / length) * 2.15 * delta, -2.72, 2.72)
      clawZ = clamp(clawZ + (depth / length) * 2.15 * delta, -1.92, 1.8)
    }

    if (state === 'lowering') {
      clawY = Math.max(CLAW_LOW_Y, clawY - 2.1 * delta)
      if (clawY === CLAW_LOW_Y) {
        changeState('readyToGrab')
        setStatus('READY TO GRAB', 'SPACE를 한 번 더 눌러 집게를 접으세요')
      }
    }

    if (state === 'closing') {
      closure = Math.min(1, stateTime / 0.62)
      if (closure === 1) {
        attemptGrab()
        changeState('lifting')
      }
    }

    if (state === 'lifting') {
      clawY = Math.min(CLAW_HOME_Y, clawY + 1.85 * delta)
      const liftProgress = (clawY - CLAW_LOW_Y) / (CLAW_HOME_Y - CLAW_LOW_Y)
      if (heldPlush && !heldStable && liftProgress >= unstableDropAt) releaseUnstablePlush()
      if (clawY === CLAW_HOME_Y) {
        changeState('carrying')
        setStatus('TO THE EXIT', heldPlush ? '인형을 출구로 옮기고 있어요' : '집게가 출구로 이동하고 있어요')
      }
    }

    if (state === 'carrying' && moveClawTo(CHUTE_X, CHUTE_Z, 2.25, delta)) {
      dropReleased = false
      changeState('dropping')
      setStatus('OPENING', heldPlush ? '출구 위에서 집게를 펼칩니다' : '집게를 다시 펼칩니다')
    }

    if (state === 'dropping') {
      closure = Math.max(0, 1 - stateTime / 0.58)
      if (!dropReleased && stateTime > 0.2) {
        dropReleased = true
        releasePrizeAtExit()
      }
      if (stateTime > 1.25) {
        changeState('returning')
        setStatus('RESETTING', '집게가 처음 위치로 돌아갑니다')
      }
    }

    if (state === 'returning' && moveClawTo(0, -0.15, 2.45, delta)) {
      changeState('aiming')
      setStatus('READY', '방향키로 다음 인형의 위치를 정해 주세요')
    }

    if (heldPlush) {
      heldPlush.group.position.set(clawX, clawY - 0.94, clawZ)
      const wobble = heldStable ? 0.035 : 0.16
      heldPlush.group.rotation.z = Math.sin(now * 0.006) * wobble
      heldPlush.group.rotation.x = Math.cos(now * 0.005) * wobble * 0.55
    }

    updatePlushPhysics(delta)

    carriage.position.x = clawX
    carriage.position.z = clawZ
    clawRoot.position.y = clawY
    clawRoot.rotation.y += delta * 0.16
    cable.position.y = clawY + (5.43 - clawY) / 2
    cable.scale.y = Math.max(0.04, 5.43 - clawY)
    prongs.forEach((prong) => { prong.rotation.z = THREE.MathUtils.lerp(0.66, 0.12, closure) })
    targetRing.position.x = clawX
    targetRing.position.z = clawZ
    targetRing.visible = state === 'aiming' || state === 'lowering' || state === 'readyToGrab'
    targetRingMaterial.opacity = 0.55 + Math.sin(now * 0.006) * 0.22
  }

  const resize = () => {
    const width = root.clientWidth || window.innerWidth
    const height = root.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    if (camera.aspect < 0.78) camera.position.set(8.8, 7.2, 14.5)
    else if (camera.aspect < 1.2) camera.position.set(8.6, 6.8, 12.3)
    else camera.position.set(8.4, 6.4, 10.4)
    camera.lookAt(0, 2.75, 0)
    camera.updateProjectionMatrix()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!active) return
    if (event.key.startsWith('Arrow')) {
      event.preventDefault()
      if (state === 'aiming') pressedKeys.add(event.key)
    }
    if (event.code === 'Space') {
      event.preventDefault()
      if (!event.repeat) runSpaceAction()
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.key)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', () => pressedKeys.clear())

  directionButtons.forEach((button) => {
    const key = button.dataset.clawKey!
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      if (state === 'aiming') pressedKeys.add(key)
    })
    button.addEventListener('pointerup', () => pressedKeys.delete(key))
    button.addEventListener('pointerleave', () => pressedKeys.delete(key))
  })
  window.addEventListener('pointerup', () => pressedKeys.clear())
  spaceButton.addEventListener('click', runSpaceAction)

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(root)
  resize()
  updateControls()

  const renderLoop = (now: number) => {
    requestAnimationFrame(renderLoop)
    const delta = Math.min((now - lastFrame) / 1000, 0.04)
    lastFrame = now
    if (!active) return
    updateMachine(delta, now)
    renderer.render(scene, camera)
  }
  requestAnimationFrame(renderLoop)

  return {
    setActive(nextActive: boolean) {
      active = nextActive
      pressedKeys.clear()
      lastFrame = performance.now()
      if (active) resize()
    },
  }
}
