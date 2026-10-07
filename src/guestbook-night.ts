export function initGuestbookNight(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('#guestbook-night')!
  const stars = root.querySelector<HTMLElement>('.guestbook-pixel-stars')!
  const fragment = document.createDocumentFragment()
  const placements = [
    { left: 42, top: 2, size: 40 },
    { left: 53, top: 32, size: 28 },
    { left: 69, top: 8, size: 34 },
    { left: 91, top: 63, size: 24 },
    { left: 27, top: 2, size: 28 },
  ]
  placements.forEach(({ left, top, size }, index) => {
    const star = document.createElement('i')
    star.className = 'guestbook-pixel-star'
    if (index === 4) star.classList.add('guestbook-pixel-star--above-list')
    star.style.left = `${left}%`
    star.style.top = `${top}%`
    star.style.setProperty('--star-size', `${size}px`)
    star.style.setProperty('--star-duration', `${3 + index * .6}s`)
    star.style.setProperty('--star-delay', `${-index * .8}s`)
    fragment.append(star)
  })
  stars.append(fragment)
  const listButton = root.querySelector<HTMLElement>('#guestbook-layout')!
  const listStar = stars.querySelector<HTMLElement>('.guestbook-pixel-star--above-list')!
  const positionListStar = () => {
    const bounds = listButton.getBoundingClientRect()
    if (!bounds.width) return
    listStar.style.left = `${bounds.left + bounds.width / 2}px`
    listStar.style.top = `${bounds.top - 42}px`
  }
  new ResizeObserver(positionListStar).observe(root)
  window.addEventListener('resize', positionListStar)
  root.addEventListener('scroll', positionListStar, { passive: true })
  requestAnimationFrame(positionListStar)
  let night = false
  try { night = localStorage.getItem('guestbook-night') === 'true' } catch { /* Optional preference. */ }
  const apply = () => {
    root.classList.toggle('is-night', night)
    button.textContent = night ? 'night ☾' : 'day ☀'
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
