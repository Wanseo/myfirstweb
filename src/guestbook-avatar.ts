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

export function createGuestbookAvatar(character: number, frame = 0): HTMLImageElement | HTMLSpanElement {
  const avatar = document.createElement('img')
  avatar.className = `guestbook-avatar guestbook-avatar--frame-${frame}`
  avatar.alt = ''
  avatar.width = 54
  avatar.height = 77
  avatar.src = characters[character % characters.length]!
  const characterIndex = character % characters.length
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
  const { x, y, color } = expression
  face.innerHTML = `<rect x="${x - 18}" y="${y - 2}" width="36" height="26" fill="${color}"/><path fill="#000" d="M${x - 11} ${y}h5v6h-5ZM${x + 7} ${y}h5v6h-5ZM${x - 5} ${y + 7}h12v6h-12Z"/>`
  portrait.append(avatar, face)
  return portrait
}
