import faces from './guestbook-faces.json'
// Original sprites from the supplied sheet.
const characters = Object.entries(import.meta.glob<string>(
  './assets/guestbook-characters/character-*.png',
  { eager: true, query: '?url', import: 'default' },
)).sort(([left], [right]) => left.localeCompare(right)).map(([, url]) => url)

// Each character is used once before the next cycle starts. Keep existing
// assignments intact when entries are refreshed, edited, or arrive in realtime.
export function createGuestbookCharacterPicker() {
  const assigned = new Map<string, number>()
  const uses = characters.map(() => 0)
  let previous = -1
  return (id: string) => {
    const existing = assigned.get(id)
    if (existing !== undefined) return existing
    const minimum = Math.min(...uses)
    let available = uses.flatMap((count, index) => count === minimum ? [index] : [])
    if (available.length > 1) available = available.filter(index => index !== previous)
    const seed = [...id].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0)
    const index = available[seed % available.length]!
    uses[index] = uses[index]! + 1
    assigned.set(id, index)
    previous = index
    return index
  }
}

// Only four plain blob sprites receive mixed colours; animal/accessory sprites
// keep their original colours, regardless of the visitor they are assigned to.
const plainBlobPalettes: Record<number, readonly string[]> = {
  3: ['#fff2df', '#fff2df', '#ffc3d3', '#f5acb4', '#ffdbbd'],
  17: ['#faf4ff', '#faf4ff', '#d4c2ee', '#b8d9ed', '#e6d4f4'],
  40: ['#f9efd9', '#f9efd9', '#dfbd92', '#cda883', '#ead6b4'],
  54: ['#f8f5d9', '#f8f5d9', '#c6e4aa', '#a5d4bc', '#d8edc4'],
}

export function createGuestbookAvatar(character: number, frame = 0): HTMLImageElement | HTMLSpanElement {
  const avatar = document.createElement('img')
  avatar.className = `guestbook-avatar guestbook-avatar--frame-${frame}`
  avatar.alt = ''
  avatar.width = 54
  avatar.height = 77
  avatar.src = characters[character % characters.length]!
  const characterIndex = character % characters.length
  const mixedColors = plainBlobPalettes[characterIndex] ?? false
  if (characterIndex < 56 && !mixedColors) return avatar
  // Every sprite uses the same pixel eyes and smile, aligned to its own face.
  const portrait = document.createElement('span')
  portrait.className = avatar.className
  avatar.className = 'guestbook-dog-image'
  const expression = faces[characterIndex]!
  const face = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  face.setAttribute('viewBox', '0 0 128 128')
  face.setAttribute('aria-hidden', 'true')
  face.setAttribute('shape-rendering', 'crispEdges')
  face.classList.add('guestbook-dog-face')
  const { x, y } = expression
  const cleanup = expression.patches.map(patch => `<rect x="${patch.x}" y="${patch.y}" width="${patch.width}" height="${patch.height}" fill="${patch.color}"/>`).join('')
  const cleanupId = `guestbook-cleanup-${characterIndex}-${frame}`
  face.innerHTML = `<defs><clipPath id="${cleanupId}"><path d="${expression.cleanupClip}"/></clipPath></defs><g clip-path="url(#${cleanupId})">${cleanup}</g><path fill="#000" d="M${x - 11} ${y}h5v6h-5ZM${x + 7} ${y}h5v6h-5ZM${x - 5} ${y + 7}h12v6h-12Z"/>`
  portrait.append(avatar)
  if (mixedColors) {
    const colors = mixedColors
    const mosaic = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mosaic.setAttribute('viewBox', '0 0 128 128')
    mosaic.setAttribute('aria-hidden', 'true')
    mosaic.setAttribute('shape-rendering', 'crispEdges')
    mosaic.classList.add('guestbook-pixel-mosaic')
    const maskId = `guestbook-mosaic-${characterIndex}-${frame}`
    let patches = ''
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 13; col++) {
        const color = colors[((col * 7 + row * 11 + Math.floor(col / 3) * 5) % 13) % colors.length]!
        patches += `<rect x="${col * 10}" y="${row * 10}" width="10" height="10" fill="${color}"/>`
      }
    }
    mosaic.innerHTML = `<defs><filter id="${maskId}-threshold" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="discrete" tableValues="0 0 1 1"/><feFuncG type="discrete" tableValues="0 0 1 1"/><feFuncB type="discrete" tableValues="0 0 1 1"/></feComponentTransfer><feMorphology operator="erode" radius="1"/></filter><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128"><image href="${avatar.src}" width="128" height="128" filter="url(#${maskId}-threshold)"/></mask></defs><g mask="url(#${maskId})">${patches}</g>`
    portrait.append(mosaic)
    if (characterIndex < 56) return portrait
  }
  portrait.append(face)
  if (characterIndex === 114 || characterIndex === 131) {
    const accessory = avatar.cloneNode() as HTMLImageElement
    accessory.className = 'guestbook-character-accessory'
    accessory.style.clipPath = characterIndex === 131
      ? 'polygon(0 73%, 100% 73%, 100% 100%, 0 100%)'
      : 'polygon(59% 0, 100% 0, 100% 100%, 54% 100%, 54% 78%, 59% 61%)'
    portrait.append(accessory)
  }
  if (characterIndex === 131) portrait.classList.add('guestbook-avatar--fixed-facing')
  // Composite at the source's pixel resolution before scaling. SVG and PNG
  // layers otherwise snap to different screen pixels at small display sizes.
  if (!mixedColors) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    canvas.className = 'guestbook-pixel-canvas'
    const context = canvas.getContext('2d')!
    const paintedFace = new Image()
    paintedFace.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(face))
    void Promise.all([avatar.decode(), paintedFace.decode()]).then(() => {
      context.imageSmoothingEnabled = false
      context.drawImage(avatar, 0, 0, 128, 128)
      context.drawImage(paintedFace, 0, 0, 128, 128)
      if (characterIndex === 131 || characterIndex === 114) {
        context.save()
        context.beginPath()
        if (characterIndex === 131) context.rect(0, 94, 128, 34)
        else { context.moveTo(76, 0); context.lineTo(128, 0); context.lineTo(128, 128); context.lineTo(69, 128); context.lineTo(69, 100); context.lineTo(76, 78) }
        context.clip()
        context.drawImage(avatar, 0, 0, 128, 128)
        context.restore()
      }
      portrait.append(canvas)
      portrait.classList.add('guestbook-avatar--rasterized')
    }).catch(() => { /* Keep the visible SVG fallback if decoding fails. */ })
  }
  return portrait
}
