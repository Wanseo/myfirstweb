import html2canvas from 'html2canvas'
import dayLandscape from './assets/guestbook-landscape.svg?raw'
import nightLandscape from './assets/guestbook-landscape-night.svg?raw'

export function initGuestbookCamera(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('#guestbook-camera')!
  const status = root.querySelector<HTMLElement>('#guestbook-camera-status')!
  button.addEventListener('click', async () => {
    if (button.disabled) return
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    root.classList.add('is-capturing')
    status.textContent = ''
    try {
      await document.fonts.ready
      const captureScale = Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.5 : 2)
      // Native form controls are rendered inconsistently by html2canvas.
      const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.guestbook-form input, .guestbook-form textarea')].map(field => {
        const computed = getComputedStyle(field)
        const placeholder = getComputedStyle(field, '::placeholder')
        return {
          id: field.id, text: field.value || field.placeholder,
          multiline: field instanceof HTMLTextAreaElement,
          width: field.getBoundingClientRect().width, height: field.getBoundingClientRect().height,
          styles: Array.from(computed).map(property => [property, computed.getPropertyValue(property)]),
          color: field.value ? computed.color : placeholder.color,
          fontSize: field.value ? computed.fontSize : placeholder.fontSize,
          scrollTop: field.scrollTop, scrollLeft: field.scrollLeft,
        }
      })
      const canvas = await html2canvas(document.body, {
        width: innerWidth, height: innerHeight, x: 0, y: 0,
        scrollX: 0, scrollY: 0, scale: captureScale,
        useCORS: true, logging: false, backgroundColor: null,
        onclone(doc) {
          doc.body.style.background = 'transparent'
          const view = doc.querySelector<HTMLElement>('#guestbook-view')!
          view.style.background = 'transparent' 
          const style = doc.createElement('style')
          style.textContent = '* { animation-play-state: paused !important; caret-color: transparent !important; }'
          style.textContent += '.guestbook-note, .guestbook-note * { animation: none !important; transition: none !important; opacity: 1 !important; filter: none !important; }'
          style.textContent += '.guestbook-bubble-frame::before, .guestbook-bubble-frame::after { content: none !important; display: none !important; background: transparent !important; }'
          doc.head.append(style)
          const camera = doc.querySelector<HTMLButtonElement>('#guestbook-camera')!
          camera.disabled = false
          camera.removeAttribute('aria-busy')
          fields.forEach(field => {
            const original = doc.getElementById(field.id)!
            const replacement = doc.createElement('div')
            field.styles.forEach(([property, value]) => replacement.style.setProperty(property!, value!))
            Object.assign(replacement.style, {
              width: `${field.width}px`, height: `${field.height}px`, boxSizing: 'border-box',
              overflow: 'hidden', display: 'flex', alignItems: field.multiline ? 'flex-start' : 'center',
              color: field.color, fontSize: field.fontSize,
            })
            const text = doc.createElement('span')
            text.textContent = field.text
            Object.assign(text.style, {
              whiteSpace: field.multiline ? 'pre-wrap' : 'pre', overflowWrap: 'break-word',
              minWidth: '0', width: '100%', flexShrink: '0',
              transform: `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`,
            })
            replacement.append(text)
            original.replaceWith(replacement)
          })
          doc.querySelectorAll<HTMLElement>('.guestbook-bubble-frame').forEach(frame => {
            const width = frame.offsetWidth + 10, height = frame.offsetHeight + 10
            const image = doc.createElement('canvas')
            const scale = captureScale
            image.width = Math.ceil(width * scale)
            image.height = Math.ceil(height * scale)
            const context = image.getContext('2d')!
            context.scale(scale, scale)
            const polygon = (x: number, y: number, w: number, h: number, color: string) => {
              const points = [[x + 8, y], [x + w - 8, y], [x + w - 8, y + 8], [x + w, y + 8],
                [x + w, y + h - 8], [x + w - 8, y + h - 8], [x + w - 8, y + h], [x + 8, y + h],
                [x + 8, y + h - 8], [x, y + h - 8], [x, y + 8], [x + 8, y + 8]]
              context.beginPath()
              points.forEach(([px, py], index) => index ? context.lineTo(px!, py!) : context.moveTo(px!, py!))
              context.closePath()
              context.fillStyle = color
              context.fill()
            }
            polygon(0, 0, width, height, '#09201d')
            polygon(5, 5, width - 10, height - 10, '#f7f7f2')
            image.style.cssText = `position:absolute;left:-5px;top:-5px;width:${width}px;height:${height}px;z-index:-1;pointer-events:none;`
            frame.replaceWith(image)
          })
        },
      })
      // Paint the SVG landscape explicitly: html2canvas can omit fixed SVG backgrounds.
      const landscape = new Image()
      const svg = (root.classList.contains('is-night') ? nightLandscape : dayLandscape).replace('<svg ', '<svg width="105" height="54" ')
      landscape.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await landscape.decode()
      const composed = document.createElement('canvas')
      composed.width = canvas.width; composed.height = canvas.height
      const context = composed.getContext('2d')!
      context.imageSmoothingEnabled = false
      const cover = Math.max(composed.width / 105, composed.height / 54)
      context.drawImage(landscape, (composed.width - 105 * cover) / 2, (composed.height - 54 * cover) / 2, 105 * cover, 54 * cover)
      context.drawImage(canvas, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => composed.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()).replace(/[^0-9]/g, '')
      link.href = url
      link.download = `guestbook-${stamp}.png`
      link.style.display = 'none'
      link.rel = 'noopener'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
      status.textContent = '화면을 PNG로 저장했어요.'
    } catch {
      status.textContent = '화면 저장에 실패했어요. 다시 눌러 주세요.'
    } finally {
      root.classList.remove('is-capturing')
      button.disabled = false
      button.removeAttribute('aria-busy')
      window.setTimeout(() => { status.textContent = '' }, 4000)
    }
  })
}
