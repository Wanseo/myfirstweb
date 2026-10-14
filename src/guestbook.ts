import { trackEvent } from './analytics'
import { initGuestbookCamera } from './guestbook-camera'
import { initGuestbookMusic } from './guestbook-music'
import { initGuestbookNight } from './guestbook-night'
import { initGuestbookRoaming } from './guestbook-roaming'
import { createGuestbookAvatar, createGuestbookCharacterPicker } from './guestbook-avatar'
import { createClient } from '@supabase/supabase-js'

type Entry = { id: string; name: string; message: string; created_at: string }

function parseEditKeys(value: unknown): Record<string, string> {
  const keys: Record<string, string> = {}
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [id, token] of Object.entries(value)) {
      if (/^[a-f0-9-]{36}$/.test(id) && typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) keys[id] = token
    }
  }
  return keys
}

export { guestbookMarkup } from './guestbook-markup'

export function initGuestbook(root: HTMLElement) {
  initGuestbookCamera(root)
  initGuestbookNight(root)
  const music = initGuestbookMusic(root)
  const form = root.querySelector<HTMLFormElement>('form')!
  const name = root.querySelector<HTMLInputElement>('#guestbook-name')!
  const message = root.querySelector<HTMLTextAreaElement>('textarea')!
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!
  const cancelEdit = root.querySelector<HTMLButtonElement>('#guestbook-edit-cancel')!
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
  for (const field of [name, message]) {
    field.addEventListener('touchstart', () => {
      if (matchMedia('(max-width: 700px)').matches && document.activeElement !== field) {
        // Switch directly between fields before the keyboard can shift the layout.
        field.focus({ preventScroll: true })
      }
    }, { passive: true })
    field.addEventListener('pointerdown', event => {
      if (event instanceof PointerEvent && event.pointerType === 'touch' && matchMedia('(max-width: 700px)').matches) {
        field.focus({ preventScroll: true })
      }
    })
    root.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`)?.addEventListener('touchstart', () => {
      if (matchMedia('(max-width: 700px)').matches) field.focus({ preventScroll: true })
    }, { passive: true })
  }
  message.addEventListener('input', () => {
    root.querySelector('#guestbook-length')!.textContent = `${message.value.length} / 500`
  })
  if (!url || !key || !/^https:\/\/[^/]+/.test(url) || key.startsWith('sb_secret_')) {
    status.textContent = '방명록 연결 준비 중입니다. Supabase 환경변수 설정 후 사용할 수 있어요.'
    submit.disabled = true
    refresh.disabled = true
    empty.textContent = 'Supabase 연결 후 방문자들의 이야기가 여기에 모입니다.'
    return { setActive: (active: boolean) => music.setActive(active) }
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const entries = new Map<string, Entry>()
  const pickCharacter = createGuestbookCharacterPicker()
  const ownershipKey = `guestbook-edit-keys:${new URL(url).host}`
  let editKeys: Record<string, string> = {}
  try {
    editKeys = parseEditKeys(JSON.parse(localStorage.getItem(ownershipKey) ?? '{}'))
  } catch { /* Reading remains available when browser storage is disabled. */ }
  let editingId: string | null = null
  const saveKeys = () => {
    editKeys = { ...parseEditKeys(JSON.parse(localStorage.getItem(ownershipKey) ?? '{}')), ...editKeys }
    localStorage.setItem(ownershipKey, JSON.stringify(editKeys))
  }
  const resetEditor = () => {
    editingId = null
    cancelEdit.hidden = true
    submit.textContent = 'commit'
    form.reset()
    root.querySelector('#guestbook-length')!.textContent = '0 / 500'
  }
  const beginEdit = (entry: Entry) => {
    if (submit.disabled) return
    editingId = entry.id
    name.value = entry.name
    message.value = entry.message
    root.querySelector('#guestbook-length')!.textContent = `${entry.message.length} / 500`
    submit.textContent = '수정 저장'
    cancelEdit.hidden = false
    status.textContent = '내 글을 수정하고 있어요.'
    form.scrollIntoView({ behavior: 'smooth', block: 'center' })
    message.focus({ preventScroll: true })
  }
  cancelEdit.addEventListener('click', () => { resetEditor(); status.textContent = '' })
  let page = 0
  let loading = false
  let started = false
  let active = false
  let connected = false
  const render = (newId?: string) => {
    const ordered = [...entries.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    // Assign older entries first so a new entry cannot change existing characters.
    for (const entry of [...ordered].reverse()) pickCharacter(entry.id)
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
      const character = pickCharacter(entry.id)
      walker.append(createGuestbookAvatar(character, 0), createGuestbookAvatar(character, 1))
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
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(new Date(entry.created_at))
      date.textContent = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('.')
      footer.append(date)
      if (editKeys[entry.id]) {
        const edit = document.createElement('button')
        edit.type = 'button'
        edit.className = 'guestbook-edit-button'
        edit.textContent = '수정'
        edit.setAttribute('aria-label', `${entry.name}님의 내 글 수정`)
        edit.addEventListener('click', () => beginEdit(entry))
        footer.append(edit)
      }
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
    root.classList.add('is-loading')
    refresh.disabled = more.disabled = true
    const targetPage = nextPage ? page + 1 : 0
    if (!entries.size) empty.textContent = '이야기를 불러오는 중이에요…'
    try {
      const { data, error } = await client.from('guestbook_entries').select('id,name,message,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(targetPage * 50, targetPage * 50 + 49)
      if (error) throw error
      if (!nextPage) entries.clear()
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
      root.classList.remove('is-loading')
      refresh.disabled = more.disabled = false
    }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    const author = name.value.trim()
    const text = message.value.trim()
    if (!author || !text) { status.textContent = '이름과 하고 싶은 말을 모두 입력해 주세요.'; return }
    trackEvent('guestbook_submit', { operation: editingId ? 'edit' : 'create' }, 'guestbook')
    root.classList.add('is-saving')
    submit.disabled = true
    cancelEdit.disabled = true
    submit.textContent = '전하는 중…'
    status.textContent = ''
    try {
      let saved: Entry
      let canEdit = false
      if (editingId) {
        const { data, error } = await client.rpc('edit_guestbook_entry', {
          p_entry_id: editingId, p_name: author, p_message: text, p_edit_token: editKeys[editingId],
        }).single<Entry>()
        if (error) throw error
        saved = data
        canEdit = true
      } else {
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join('')
        // Verify persistent storage before creating an editable entry.
        saveKeys()
        const { data, error } = await client.rpc('create_guestbook_entry', {
          p_name: author, p_message: text, p_edit_token: token,
        }).single<Entry>()
        if (error?.code === 'PGRST202') {
          // Existing sites keep accepting entries until the additive SQL is run.
          const legacy = await client.from('guestbook_entries').insert({ name: author, message: text }).select('id,name,message,created_at').single<Entry>()
          if (legacy.error) throw legacy.error
          saved = legacy.data
        } else {
          if (error) throw error
          saved = data!
          editKeys[saved.id] = token
          saveKeys()
          canEdit = true
        }
      }
      const wasEditing = editingId !== null
      trackEvent('guestbook_save', { operation: wasEditing ? 'edit' : 'create' }, 'guestbook')
      // Re-render even if Realtime delivered the row before its private key was stored.
      entries.set(saved.id, saved)
      render(wasEditing ? undefined : saved.id)
      resetEditor()
      if (matchMedia('(max-width: 700px)').matches) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        root.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
      status.textContent = wasEditing ? '수정한 내용이 저장됐어요!' : canEdit ? '저장됐어요! 이 브라우저에서 list → 수정으로 바꿀 수 있어요.' : '' 
    } catch {
      trackEvent('guestbook_save_error', { operation: editingId ? 'edit' : 'create' }, 'guestbook')
      status.textContent = '저장하지 못했어요. 입력 내용은 유지됩니다. 연결과 Supabase 설정을 확인해 주세요.'
    } finally {
      root.classList.remove('is-saving')
      submit.disabled = false
      cancelEdit.disabled = false
      submit.textContent = editingId ? '수정 저장' : 'commit'
    }
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== ownershipKey) return
    try {
      editKeys = parseEditKeys(JSON.parse(event.newValue ?? '{}'))
      render()
    } catch { /* Ignore corrupt local ownership data. */ }
  })
  refresh.addEventListener('click', () => {
    if (matchMedia('(max-width: 700px)').matches) {
      location.reload()
    } else {
      void load()
    }
  })
  more.addEventListener('click', () => {
    trackEvent('guestbook_load_more', {}, 'guestbook')
    void load(true)
  })
  const channel = client.channel('guestbook-board').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook_entries' }, (payload) => merge(payload.new as Entry, true)).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'guestbook_entries' }, (payload) => merge(payload.new as Entry)).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'guestbook_entries' }, (payload) => {
    const id = payload.old.id as string | undefined
    if (id && entries.delete(id)) render()
  })
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active) void load() })
  window.addEventListener('online', () => { if (active) void load() })
  window.addEventListener('pagehide', () => { void client.removeChannel(channel) })
  return {
    setActive(next: boolean) {
      music.setActive(next)
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
