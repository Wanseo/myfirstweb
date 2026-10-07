import { initGuestbookRoaming } from './guestbook-roaming'
import { createGuestbookAvatar } from './guestbook-avatar'
import { createClient } from '@supabase/supabase-js'

type Entry = { id: string; name: string; message: string; created_at: string }

export const guestbookMarkup = `
  <main class="view guestbook-view" id="guestbook-view" aria-hidden="true" hidden>
    <div class="guestbook-shell">
      <div class="guestbook-workspace">
        <form class="guestbook-form">
          <div class="guestbook-window-title">
            <span class="guestbook-window-icon" aria-hidden="true">▣</span>
            <span>Guestbook</span>
            <div class="guestbook-window-controls" aria-hidden="true"><span>_</span><span>□</span><span>×</span></div>
          </div>
          <div class="guestbook-composer-fields">
          <label for="guestbook-name">name</label><input id="guestbook-name" name="name" maxlength="30" placeholder="어떤 이름으로 남길까요?" required autocomplete="nickname">
          <label for="guestbook-message">message</label><textarea id="guestbook-message" name="message" maxlength="500" rows="6" placeholder="오늘의 기분, 인사, 짧은 이야기…" required></textarea>
          <div class="guestbook-form-footer"><span id="guestbook-length">0 / 500</span><button type="submit">commit</button></div>
          <p class="guestbook-status" id="guestbook-status" role="status" aria-live="polite"></p>
          </div>
        </form>
        <section class="guestbook-board" aria-label="방문자들의 말풍선">
          <div class="guestbook-board-heading"><span id="guestbook-count" hidden>0</span><button id="guestbook-layout" type="button" aria-pressed="false">목록 보기 ☰</button><button id="guestbook-refresh" type="button">새로고침 ↻</button></div>
          <p id="guestbook-connection" hidden></p>
          <p id="guestbook-empty">아직 이야기가 없어요. 첫 번째 인사를 남겨 주세요!</p>
          <div class="guestbook-notes" id="guestbook-notes"></div>
          <button id="guestbook-more" type="button" hidden>이전 방명록 더 보기</button>
        </section>
      </div>
    </div>
  </main>`

export function initGuestbook(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('form')!
  const name = root.querySelector<HTMLInputElement>('#guestbook-name')!
  const message = root.querySelector<HTMLTextAreaElement>('textarea')!
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!
  const status = root.querySelector<HTMLElement>('#guestbook-status')!
  const connection = root.querySelector<HTMLElement>('#guestbook-connection')!
  const notes = root.querySelector<HTMLElement>('#guestbook-notes')!
  const empty = root.querySelector<HTMLElement>('#guestbook-empty')!
  const count = root.querySelector<HTMLElement>('#guestbook-count')!
  const more = root.querySelector<HTMLButtonElement>('#guestbook-more')!
  const refresh = root.querySelector<HTMLButtonElement>('#guestbook-refresh')!
  const roaming = initGuestbookRoaming(root, notes)
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  message.addEventListener('input', () => {
    root.querySelector('#guestbook-length')!.textContent = `${message.value.length} / 500`
  })
  if (!url || !key || !/^https:\/\/[^/]+/.test(url) || key.startsWith('sb_secret_')) {
    status.textContent = '방명록 연결 준비 중입니다. Supabase 환경변수 설정 후 사용할 수 있어요.'
    submit.disabled = true
    refresh.disabled = true
    empty.textContent = 'Supabase 연결 후 방문자들의 이야기가 여기에 모입니다.'
    return { setActive: (_active: boolean) => {} }
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const entries = new Map<string, Entry>()
  let page = 0
  let loading = false
  let started = false
  let active = false
  let connected = false
  const render = (newId?: string) => {
    const ordered = [...entries.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    const fragment = document.createDocumentFragment()
    for (const entry of ordered) {
      const note = document.createElement('article')
      note.className = 'guestbook-note' + (entry.id === newId ? ' is-new' : '')
      const seed = [...entry.id].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0)
      note.dataset.entryId = entry.id
      note.dataset.seed = String(seed)
      note.tabIndex = 0
      note.setAttribute('aria-label', `${entry.name}님의 방명록`)
      const portrait = document.createElement('div')
      portrait.className = 'guestbook-portrait'
      const walker = document.createElement('div')
      walker.className = 'guestbook-walker'
      walker.style.setProperty('--walk-duration', `${7 + seed % 6}s`)
      walker.style.setProperty('--walk-delay', `${-(seed % 11)}s`)
      walker.style.setProperty('--stride-delay', `${-(seed % 5) * 0.12}s`)
      walker.append(createGuestbookAvatar(seed, 0), createGuestbookAvatar(seed, 1))
      portrait.append(walker)
      const bubble = document.createElement('div')
      bubble.className = 'guestbook-bubble'
      const frame = document.createElement('span')
      frame.className = 'guestbook-bubble-frame'
      frame.setAttribute('aria-hidden', 'true')
      const tail = document.createElement('span')
      tail.className = 'guestbook-bubble-tail'
      tail.setAttribute('aria-hidden', 'true')
      tail.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path fill="#09201d" d="M0 0H24V8H20V12H16V16H12V20H8V24H0Z"/><path fill="#f7f7f2" d="M4 0H20V4H16V8H12V12H8V16H4Z"/></svg>' 
      const body = document.createElement('p')
      body.textContent = entry.message
      const footer = document.createElement('footer')
      const author = document.createElement('strong')
      author.textContent = entry.name
      author.className = 'guestbook-author'
      author.title = entry.name
      portrait.append(author)
      const date = document.createElement('time')
      date.dateTime = entry.created_at
      date.textContent = new Date(entry.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', year: 'numeric' })
      footer.append(date)
      bubble.append(frame, tail, body, footer)
      note.append(portrait, bubble)
      fragment.append(note)
    }
    notes.replaceChildren(fragment)
    roaming.sync()
    count.textContent = String(entries.size)
    empty.hidden = entries.size > 0
  }
  const merge = (entry: Entry, animate = false) => {
    if (!entry || typeof entry.id !== 'string' || typeof entry.name !== 'string' || typeof entry.message !== 'string' || typeof entry.created_at !== 'string') return
    const previous = entries.get(entry.id)
    if (previous && previous.name === entry.name && previous.message === entry.message && previous.created_at === entry.created_at) return
    const isNew = !previous
    entries.set(entry.id, entry)
    render(animate && isNew ? entry.id : undefined)
  }
  const load = async (nextPage = false) => {
    if (loading) return
    loading = true
    refresh.disabled = more.disabled = true
    const targetPage = nextPage ? page + 1 : 0
    if (!entries.size) empty.textContent = '이야기를 불러오는 중이에요…'
    try {
      const { data, error } = await client.from('guestbook_entries').select('id,name,message,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(targetPage * 50, targetPage * 50 + 49)
      if (error) throw error
      for (const entry of data ?? []) entries.set(entry.id, entry)
      page = targetPage
      render()
      empty.textContent = '아직 이야기가 없어요. 첫 번째 인사를 남겨 주세요!'
      more.hidden = (data?.length ?? 0) < 50
      if (!connected) connection.textContent = '실시간 연결 중입니다. 새로고침으로도 최신 글을 확인할 수 있어요.'
    } catch {
      connection.textContent = '방명록을 불러오지 못했어요. 연결 상태를 확인하고 새로고침해 주세요.'
      if (!entries.size) empty.textContent = '연결 후 다시 불러와 주세요.'
    } finally {
      loading = false
      refresh.disabled = more.disabled = false
    }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    const author = name.value.trim()
    const text = message.value.trim()
    if (!author || !text) { status.textContent = '이름과 하고 싶은 말을 모두 입력해 주세요.'; return }
    submit.disabled = true
    submit.textContent = '전하는 중…'
    status.textContent = ''
    try {
      const { data, error } = await client.from('guestbook_entries').insert({ name: author, message: text }).select('id,name,message,created_at').single()
      if (error) throw error
      merge(data, true)
      form.reset()
      root.querySelector('#guestbook-length')!.textContent = '0 / 500'
      status.textContent = '당신의 이야기가 전해졌어요!'
    } catch {
      status.textContent = '저장하지 못했어요. 입력 내용은 유지됩니다. 연결과 Supabase 설정을 확인해 주세요.'
    } finally {
      submit.disabled = false
      submit.textContent = 'commit'
    }
  })
  refresh.addEventListener('click', () => void load())
  more.addEventListener('click', () => void load(true))
  const channel = client.channel('guestbook-board').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook_entries' }, (payload) => merge(payload.new as Entry, true))
  window.addEventListener('online', () => { if (active) void load() })
  window.addEventListener('pagehide', () => { void client.removeChannel(channel) })
  return {
    setActive(next: boolean) {
      active = next
      roaming.setActive(next)
      if (!next) return
      if (!started) {
        started = true
        channel.subscribe((state) => {
          connected = state === 'SUBSCRIBED'
          connection.textContent = connected ? '● 실시간으로 이야기가 이어지고 있어요' : '실시간 연결을 기다리고 있어요. 새로고침으로 최신 글을 확인할 수 있어요.'
          if (connected) void load()
        })
      }
      void load()
    },
  }
}
