export function initGuestbookNight(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('#guestbook-night')!
  const stars = root.querySelector<HTMLElement>('.guestbook-pixel-stars')!
  const fragment = document.createDocumentFragment()
  const placements = [
    { left: 42, top: 12, size: 64 },
    { left: 53, top: 32, size: 44 },
    { left: 69, top: 8, size: 54 },
    { left: 91, top: 63, size: 36 },
  ]
  placements.forEach(({ left, top, size }, index) => {
    const star = document.createElement('i')
    star.className = 'guestbook-pixel-star'
    star.style.left = `${left}%`
    star.style.top = `${top}%`
    star.style.setProperty('--star-size', `${size}px`)
    star.style.setProperty('--star-duration', `${3 + index * .6}s`)
    star.style.setProperty('--star-delay', `${-index * .8}s`)
    fragment.append(star)
  })
  stars.append(fragment)
  let night = false
  try { night = localStorage.getItem('guestbook-night') === 'true' } catch { /* Optional preference. */ }
  const apply = () => {
    root.classList.toggle('is-night', night)
    button.textContent = night ? 'day ☀' : 'night ☾'
    button.setAttribute('aria-pressed', String(night))
    button.setAttribute('aria-label', night ? '낮 배경으로 바꾸기' : '밤 배경으로 바꾸기')
  }
  button.addEventListener('click', () => {
    night = !night
    apply()
    try { localStorage.setItem('guestbook-night', String(night)) } catch { /* Keep toggle working without storage. */ }
  })
  apply()
}
