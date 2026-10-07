// Original sprites from the supplied sheet. Entry IDs distribute characters
// pseudo-randomly while keeping each visitor's character stable on reload.
const characters = Object.entries(import.meta.glob<string>(
  './assets/guestbook-characters/character-*.png',
  { eager: true, query: '?url', import: 'default' },
)).sort(([left], [right]) => left.localeCompare(right)).map(([, url]) => url)

export function createGuestbookAvatar(seed: number, frame = 0): HTMLImageElement {
  const avatar = document.createElement('img')
  avatar.className = `guestbook-avatar guestbook-avatar--frame-${frame}`
  avatar.alt = ''
  avatar.width = 54
  avatar.height = 77
  avatar.src = characters[seed % characters.length]!
  return avatar
}
