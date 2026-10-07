type Walker = { element: HTMLElement; x: number; y: number; targetX: number; targetY: number; speed: number; seed: number; bubbleHeight: number; bubbleWidth: number; retryAt: number; detourAngle?: number; detourUntil?: number; detourSoft?: boolean; facing?: number; turnTravel?: number; lastTurnAt?: number; motionCheckAt?: number; motionCheckX?: number; motionCheckY?: number }

export function initGuestbookRoaming(root: HTMLElement, stage: HTMLElement) {
  let walkers: Walker[] = []
  let active = false
  let frame = 0
  let previous = 0
  let list = false
  let pointer: { x: number; y: number } | undefined
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') pointer = { x: event.clientX, y: event.clientY }
  }, { passive: true })
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) pointer = undefined })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const toggle = root.querySelector<HTMLButtonElement>('#guestbook-layout')!
  let width = innerWidth
  let height = innerHeight
  let formBounds = root.querySelector('form')!.getBoundingClientRect()
  const measure = () => {
    width = innerWidth
    height = innerHeight
    formBounds = root.querySelector('form')!.getBoundingClientRect()
  }
  const bounds = (x: number, y: number, walker: Walker) => {
    const mobile = width <= 700
    const bubbleWidth = walker.bubbleWidth
    const left = Math.max(8, Math.min(width - bubbleWidth - 8, x + (mobile ? 22.5 : 27) - bubbleWidth / 2))
    return { left: left - 6, right: left + bubbleWidth + 9, top: y - walker.bubbleHeight - 21, bottom: y + (mobile ? 64 : 77) + 32 }
  }
  type Bounds = ReturnType<typeof bounds>
  const overlap = (a: Bounds, b: Bounds) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const minY = (walker: Walker) => Math.min(Math.max(0, height - 130), Math.max(60, walker.bubbleHeight + 35))
  const formCollision = (x: number, y: number) => {
    const mobile = width <= 700
    const actor = { left: x - (mobile ? 13.5 : 16), right: x + (mobile ? 58.5 : 70), top: y, bottom: y + (mobile ? 64 : 77) }
    const form = { left: formBounds.left - 8, right: formBounds.right + 8, top: formBounds.top - 8, bottom: formBounds.bottom + 8 }
    return overlap(actor, form)
  }
  const inBounds = (walker: Walker, x: number, y: number) => x >= 24 && x <= Math.max(24, width - 92) && y >= minY(walker) && y <= Math.max(minY(walker), height - 120) && formCollision(x, y) <= formCollision(walker.x, walker.y) + .001

  const crowding = (walker: Walker, x: number, y: number) => {
    const box = bounds(x, y, walker)
    const form = { left: formBounds.left - 12, right: formBounds.right + 12, top: formBounds.top - 12, bottom: formBounds.bottom + 12 }
    let score = overlap(box, form) * 5
    for (const other of walkers) {
      if (other !== walker) score += overlap(box, bounds(other.x, other.y, other))
    }
    return score
  }
  const target = (walker: Walker, initial = false) => {
    const lowY = minY(walker)
    const maxY = Math.max(lowY, height - 130)
    const maxX = Math.max(24, width - 92)
    let bestX = walker.x, bestY = walker.y, bestScore = Infinity
    // Spread new arrivals across the available space, including their bubbles.
    for (let attempt = 0; attempt < (initial ? 400 : 70); attempt++) {
      // Prefer clear diagonal journeys between destinations. Collision avoidance
      // can still bend the path when another visitor is in the way.
      const angle = (attempt % 3 === 0 ? 0 : Math.PI / 4) + Math.floor(Math.random() * 4) * Math.PI / 2
      const travel = 35 + Math.random() * 220
      const x = initial ? 24 + Math.random() * Math.max(0, maxX - 24) : walker.x + Math.cos(angle) * travel
      const y = initial ? lowY + Math.random() * Math.max(0, maxY - lowY) : walker.y + Math.sin(angle) * travel
      if (!inBounds(walker, x, y)) continue
      const score = crowding(walker, x, y)
      if (score < bestScore) { bestX = x; bestY = y; bestScore = score }
      if (score === 0) break
    }
    walker.targetX = bestX
    walker.targetY = bestY
    if (initial) { walker.x = bestX; walker.y = bestY }
  }
  const spread = () => {
    const all = walkers
    all.forEach(walker => {
      const bubble = walker.element.querySelector<HTMLElement>('.guestbook-bubble')!
      walker.bubbleHeight = bubble.offsetHeight
      walker.bubbleWidth = bubble.offsetWidth
    })
    walkers = []
    for (const walker of all) {
      target(walker, true)
      walkers.push(walker)
      target(walker)
      place(walker)
    }
  }
  const place = (walker: Walker) => {
    walker.element.style.setProperty('--facing', String(walker.facing ?? 1))
    walker.element.style.transform = `translate(${Math.round(walker.x)}px, ${Math.round(walker.y)}px)`
    const mobile = width <= 700
    const bubbleWidth = walker.bubbleWidth
    const preferred = walker.x + (mobile ? 22.5 : 27) - bubbleWidth / 2
    const bubbleX = Math.max(8, Math.min(width - bubbleWidth - 8, preferred))
    walker.element.style.setProperty('--bubble-x', `${bubbleX - walker.x}px`)
    walker.element.style.setProperty('--bubble-tail-x', `${walker.x + (mobile ? 22.5 : 27) - bubbleX - 6}px`)
  }
  const tick = (now: number) => {
    frame = 0
    if (!active || list || reduced.matches || document.hidden) return
    if (root.classList.contains('is-capturing')) { previous = 0; frame = requestAnimationFrame(tick); return }
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0
    previous = now
    // Pause only the topmost character under the cursor, never keyboard focus.
    const hovered = pointer ? document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>('.guestbook-note') : null
    for (const walker of walkers) {
      if (hovered?.dataset.entryId === walker.element.dataset.entryId) {
        walker.element.classList.add('is-paused')
        walker.motionCheckAt = now
        place(walker)
        continue
      }
      walker.element.classList.remove('is-paused')
      {
        if (!inBounds(walker, walker.x, walker.y)) {
          walker.x = Math.max(24, Math.min(Math.max(24, width - 92), walker.x))
          walker.y = Math.max(minY(walker), Math.min(Math.max(minY(walker), height - 120), walker.y))
          target(walker)
        }
        if (now - (walker.motionCheckAt ?? 0) >= 2500) {
          if (walker.motionCheckX !== undefined && Math.hypot(walker.x - walker.motionCheckX, walker.y - walker.motionCheckY!) < 6) {
            target(walker)
            walker.detourAngle = Math.atan2(walker.targetY - walker.y, walker.targetX - walker.x)
            walker.detourUntil = now + 1800
            walker.detourSoft = true
          }
          walker.motionCheckAt = now
          walker.motionCheckX = walker.x; walker.motionCheckY = walker.y
        }
        if (Math.hypot(walker.targetX - walker.x, walker.targetY - walker.y) < 3) target(walker)
        const dx = walker.targetX - walker.x, dy = walker.targetY - walker.y
        const angle = now < (walker.detourUntil ?? 0) ? walker.detourAngle! : Math.atan2(dy, dx)
        const step = walker.speed * dt
        const currentOverlap = crowding(walker, walker.x, walker.y)
        let bestX = walker.x, bestY = walker.y
        let bestCost = currentOverlap * 30 + Math.hypot(dx, dy)
        let escape: { x: number; y: number; angle: number; cost: number } | undefined
        // Try forward, sideways, and backward paths. Never worsen an overlap.
        for (const turn of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
          const x = walker.x + Math.cos(angle + turn) * step
          const y = walker.y + Math.sin(angle + turn) * step
          if (!inBounds(walker, x, y)) continue
          const overlapScore = crowding(walker, x, y)
          if (overlapScore > currentOverlap + .001 && !(walker.detourSoft && now < (walker.detourUntil ?? 0) && turn === 0)) continue
          const cost = overlapScore * 30 + Math.hypot(walker.targetX - x, walker.targetY - y)
          // A safe sideways route may temporarily lead away from the destination.
          // Remember it briefly so the character can go around an obstacle.
          if (!escape || cost < escape.cost) escape = { x, y, angle: angle + turn, cost }
          if (now < (walker.detourUntil ?? 0) && turn === 0) {
            bestX = x; bestY = y; break
          }
          if (cost < bestCost) { bestX = x; bestY = y; bestCost = cost }
        }
        if (Math.hypot(bestX - walker.x, bestY - walker.y) <= .01 && escape && step > .01) {
          bestX = escape.x; bestY = escape.y
          walker.detourAngle = escape.angle
          walker.detourUntil = now + 1200
          walker.detourSoft = false
        }
        if (Math.hypot(bestX - walker.x, bestY - walker.y) <= .01 && step > .01) {
          // In a crowded pocket, briefly accept the least crowded route rather
          // than requiring perfect separation and leaving someone stuck forever.
          let escapeCost = Infinity
          for (let direction = 0; direction < 32; direction++) {
            const escapeAngle = angle + direction * Math.PI / 16
            const x = walker.x + Math.cos(escapeAngle) * step
            const y = walker.y + Math.sin(escapeAngle) * step
            if (!inBounds(walker, x, y)) continue
            const cost = crowding(walker, x, y) * 30 + Math.hypot(walker.targetX - x, walker.targetY - y)
            if (cost < escapeCost) {
              escapeCost = cost; bestX = x; bestY = y
              walker.detourAngle = escapeAngle
            }
          }
          if (Number.isFinite(escapeCost)) { walker.detourUntil = now + 1500; walker.detourSoft = true }
        }
        const moved = Math.hypot(bestX - walker.x, bestY - walker.y) > .01
        walker.element.classList.toggle('is-paused', !moved)
        if (moved) {
          const horizontal = bestX - walker.x
          const facing = walker.facing ?? 1
          // Tiny avoidance corrections should not flip the sprite every frame.
          if (Math.abs(horizontal) > .05 && Math.sign(horizontal) !== facing) {
            walker.turnTravel = (walker.turnTravel ?? 0) + Math.abs(horizontal)
            if (walker.turnTravel >= 6 && now - (walker.lastTurnAt ?? 0) >= 800) {
              walker.facing = Math.sign(horizontal)
              walker.lastTurnAt = now
              walker.turnTravel = 0
            }
          } else if (Math.abs(horizontal) > .05) walker.turnTravel = 0
          walker.x = bestX; walker.y = bestY
        } else if (now >= walker.retryAt) {
          target(walker)
          walker.retryAt = now + 800 + walker.seed % 600
        }
      }
      place(walker)
    }
    frame = requestAnimationFrame(tick)
  }
  const start = () => { previous = 0; if (!frame && active && !list && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick) }
  const applyLayout = () => {
    root.classList.toggle('guestbook-list-mode', list || reduced.matches)
    toggle.textContent = list || reduced.matches ? 'move ↗' : 'list ☰'
    toggle.setAttribute('aria-pressed', String(list || reduced.matches))
    cancelAnimationFrame(frame); frame = 0
    walkers.forEach(walker => {
      walker.element.style.transform = ''
      if (!list && !reduced.matches) place(walker)
    })
    if (!list && !reduced.matches) spread()
    start()
  }
  toggle.addEventListener('click', () => { list = !list; applyLayout() })
  reduced.addEventListener('change', applyLayout)
  window.addEventListener('resize', () => {
    measure()
    if (!list && !reduced.matches) spread()
  })
  root.addEventListener('scroll', measure, { passive: true })
  document.addEventListener('visibilitychange', start)
  applyLayout()
  void document.fonts.ready.then(() => { if (active && !list && !reduced.matches) spread() })
  return {
    sync() {
      measure()
      const previousWalkers = new Map(walkers.map(walker => [walker.element.dataset.entryId, walker]))
      walkers = []
      for (const element of stage.querySelectorAll<HTMLElement>('.guestbook-note')) {
        const existing = previousWalkers.get(element.dataset.entryId)
        const seed = Number(element.dataset.seed)
        const bubble = element.querySelector<HTMLElement>('.guestbook-bubble')!
        const bubbleHeight = bubble.offsetHeight
        const bubbleWidth = bubble.offsetWidth
        const walker: Walker = existing
          ? { ...existing, element, bubbleHeight, bubbleWidth }
          : { element, x: 0, y: 0, targetX: 0, targetY: 0, speed: 14 + seed % 15, seed, bubbleHeight, bubbleWidth, retryAt: 0 }
        if (!existing) { target(walker, true); target(walker) }
        walkers.push(walker)
        if (!list && !reduced.matches) place(walker)
      }
      start()
    },
    setActive(next: boolean) {
      active = next
      if (next) { measure(); start() }
      else { cancelAnimationFrame(frame); frame = 0 }
    },
  }
}
