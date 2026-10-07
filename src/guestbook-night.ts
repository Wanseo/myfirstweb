export function initGuestbookNight(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('#guestbook-night')!
  const stars = root.querySelector<HTMLElement>('.guestbook-pixel-stars')!
  const fragment = document.createDocumentFragment()
  // A jittered grid keeps stars spread across the sky instead of clustering.
  for (let index = 0; index < 56; index++) {
    const star = document.createElement('i')
    star.className = 'guestbook-pixel-star'
    star.style.left = `${(index % 14 + .2 + Math.random() * .6) / 14 * 100}%`
    star.style.top = `${(Math.floor(index / 14) + .2 + Math.random() * .6) / 4 * 100}%`
    star.style.setProperty('--star-size', `${index % 5 === 0 ? 4 : 2}px`)
    star.style.setProperty('--star-duration', `${2 + index % 5 * .6}s`)
    star.style.setProperty('--star-delay', `${-(index % 11) * .4}s`)
    if (index % 7 === 0) star.classList.add('is-cross')
    fragment.append(star)
  }
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
