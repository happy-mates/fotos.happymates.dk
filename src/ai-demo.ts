import './hm-tokens.css'
import './style.css'
import './ai-demo.css'
import { initConsent } from './consent'

// Demo of local AI on old film. Plays a demo folder made by BakeSafe's
// video-AI spike (`helpers.py handover`, skill video-demo-handover):
// demo.json + media/. A folder comes either from /ai-demo/<id>/ on this site
// (listed in /ai-demo/index.json) or is opened from disk, in which case the
// files never leave the browser (object URLs only).

type Clip = { label: string; src: string; original?: boolean }
type Segment = { start: number; end: number; text: string }
type Demo = {
  format: 'bakesafe-video-demo'
  version: 1
  id: string
  title: string
  created?: string
  meta?: string
  machine?: string
  width: number
  height: number
  fps: number
  duration: number
  trimmedTo?: number | null
  after: Clip
  before: Clip[]
  segments: Segment[]
  keyframes: { src: string; t: number }[]
  summary: string
  quality: { label: string; psnr: number; ssim: number }[]
  wer: { label: string; wer: number }[]
  times: { name: string; s: number }[]
  pipeline: { kind: string; label: string; tool: string; seconds: number }[]
}
type Listed = { id: string; title: string }
type Resolve = (rel: string) => string

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const nf = (n: number, d: number) => n.toLocaleString('da-DK', { minimumFractionDigits: d, maximumFractionDigits: d })
const dur = (s: number) => (s >= 90 ? `${Math.round(s / 60)} min` : `${s} s`)

const stage = $('stage')
const R = $<HTMLVideoElement>('right')
const L = $<HTMLVideoElement>('left')
const A = new Audio()
A.preload = 'auto'

let demo: Demo | null = null
const current = () => demo
let objectURLs: string[] = []
let leftURLs: string[] = []
let noisy = false
let cc = true
let zoom = false
let z = 3
let dragging = false

// ── Loading ──────────────────────────────────────────────────────────────

// Media only ever plays from this site or from blob: URLs this page made
// itself from a folder the viewer opened.
function mediaURL(u: string): string {
  const parsed = new URL(u, location.href)
  const ok = parsed.protocol === 'blob:' ? objectURLs.includes(u) : parsed.origin === location.origin && parsed.protocol === location.protocol
  if (!ok) throw new Error(`Ugyldig medie-adresse: ${u}`)
  return parsed.href
}

const safeRel = (rel: string) => {
  if (typeof rel !== 'string' || !/^[\w\-./]+$/.test(rel) || rel.startsWith('/') || rel.split('/').includes('..')) {
    throw new Error(`Ugyldig sti i demo.json: ${rel}`)
  }
  return rel
}

function validate(d: unknown): Demo {
  const x = d as Partial<Demo>
  if (!x || x.format !== 'bakesafe-video-demo') throw new Error('Det er ikke en demo-mappe (demo.json mangler "format": "bakesafe-video-demo").')
  if (x.version !== 1) throw new Error(`Ukendt version af demo.json: ${String(x.version)}.`)
  if (!x.after?.src) throw new Error('demo.json mangler "after".')
  return {
    ...x,
    before: x.before ?? [],
    segments: x.segments ?? [],
    keyframes: x.keyframes ?? [],
    summary: x.summary ?? '',
    quality: x.quality ?? [],
    wer: x.wer ?? [],
    times: x.times ?? [],
    pipeline: x.pipeline ?? [],
  } as Demo
}

function showError(msg: string) {
  $('error').textContent = msg
  $('error').hidden = false
  $('empty').hidden = false
  $('demo').hidden = true
}

async function loadPublished(id: string) {
  const base = `/ai-demo/${encodeURIComponent(id)}/`
  try {
    const res = await fetch(base + 'demo.json')
    if (!res.ok) throw new Error(`Demoen "${id}" findes ikke.`)
    show(validate(await res.json()), (rel) => base + safeRel(rel))
    markChip(id)
  } catch (e) {
    showError((e as Error).message)
  }
}

async function loadFiles(files: { path: string; file: File }[]) {
  const manifest = files.filter((f) => f.path.split('/').pop() === 'demo.json').sort((a, b) => a.path.length - b.path.length)[0]
  if (!manifest) return showError('Mappen har ingen demo.json. Vælg den mappe, som handover-skillen lavede.')
  const dir = manifest.path.slice(0, -'demo.json'.length)
  const byPath = new Map(files.filter((f) => f.path.startsWith(dir)).map((f) => [f.path.slice(dir.length), f.file]))
  try {
    const d = validate(JSON.parse(await manifest.file.text()))
    objectURLs.forEach((u) => URL.revokeObjectURL(u))
    objectURLs = []
    const cache = new Map<string, string>()
    show(d, (rel) => {
      const p = safeRel(rel)
      if (!cache.has(p)) {
        const f = byPath.get(p)
        if (!f) throw new Error(`Mappen mangler ${p}.`)
        const u = URL.createObjectURL(f)
        objectURLs.push(u)
        cache.set(p, u)
      }
      return cache.get(p)!
    })
    markChip(null)
    history.replaceState(null, '', location.pathname)
  } catch (e) {
    showError((e as Error).message)
  }
}

$<HTMLInputElement>('folder').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])].map((file) => ({ path: file.webkitRelativePath || file.name, file }))
  input.value = ''
  if (files.length) void loadFiles(files)
})

// Drag a folder (or its files) anywhere onto the page.
async function walk(entry: FileSystemEntry, out: { path: string; file: File }[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, fail) => (entry as FileSystemFileEntry).file(ok, fail))
    out.push({ path: entry.fullPath.replace(/^\//, ''), file })
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((ok, fail) => reader.readEntries(ok, fail))
      if (!batch.length) break
      for (const child of batch) await walk(child, out)
    }
  }
}
document.addEventListener('dragover', (e) => {
  e.preventDefault()
  document.body.classList.add('aid-dragging')
})
document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('aid-dragging')
})
document.addEventListener('drop', async (e) => {
  e.preventDefault()
  document.body.classList.remove('aid-dragging')
  const entries = [...(e.dataTransfer?.items ?? [])].map((i) => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[]
  const files: { path: string; file: File }[] = []
  for (const entry of entries) await walk(entry, files)
  if (files.length) void loadFiles(files)
})

// ── Published demos ──────────────────────────────────────────────────────

function markChip(id: string | null) {
  document.querySelectorAll<HTMLButtonElement>('#chips button').forEach((b) => {
    const on = b.dataset.id === id
    b.classList.toggle('on', on)
    b.setAttribute('aria-pressed', String(on))
  })
}

async function listPublished() {
  let list: Listed[] = []
  try {
    const res = await fetch('/ai-demo/index.json')
    if (res.ok) list = (await res.json()) as Listed[]
  } catch {
    /* no published demos */
  }
  const chips = $('chips')
  for (const d of list) {
    if (!/^[a-z0-9-]+$/.test(d.id)) continue
    const b = el('button', 'aid-chip', d.title)
    b.type = 'button'
    b.dataset.id = d.id
    b.onclick = () => {
      history.replaceState(null, '', `?demo=${d.id}`)
      void loadPublished(d.id)
    }
    chips.append(b)
  }
  const wanted = new URLSearchParams(location.search).get('demo')
  const first = list.find((d) => d.id === wanted) ?? list[0]
  if (first) void loadPublished(first.id)
}

// ── Showing a demo ───────────────────────────────────────────────────────

function show(d: Demo, url: Resolve) {
  pause()
  demo = d
  $('empty').hidden = true
  $('error').hidden = true
  $('demo').hidden = false
  stage.style.setProperty('--ar', `${d.width || 16}/${d.height || 9}`)

  // Videos: R (AI, cleaned sound) is the clock; L and the original sound follow it.
  R.src = mediaURL(url(d.after.src))
  $('tagR').textContent = d.after.label
  const sel = $<HTMLSelectElement>('leftSel')
  leftURLs = d.before.map((c) => mediaURL(url(c.src)))
  sel.replaceChildren(...d.before.map((c, i) => new Option(c.label, String(i))))
  sel.closest('label')!.hidden = d.before.length < 2
  setLeft()
  const original = d.before.find((c) => c.original)
  A.src = original ? mediaURL(url(original.src)) : ''
  $('audioLabel').hidden = $('audioGrp').hidden = !original
  noisy = false
  applyAudio()

  // Keyframes
  $('frames').replaceChildren(
    ...d.keyframes.map((k) => {
      const b = el('button', 'aid-frame')
      b.type = 'button'
      b.setAttribute('aria-label', `Gå til ${fmt(k.t)}`)
      const img = el('img')
      img.src = mediaURL(url(k.src))
      img.alt = ''
      img.loading = 'lazy'
      b.append(img, el('span', '', fmt(k.t)))
      b.onclick = () => seek(k.t)
      return b
    }),
  )

  // Transcript
  $('transcriptCard').hidden = !d.segments.length
  $('transcript').replaceChildren(
    ...d.segments.map((s) => {
      const b = el('button', 'aid-line')
      b.type = 'button'
      b.append(el('b', '', fmt(s.start)), el('span', '', s.text))
      b.onclick = () => {
        seek(s.start + 0.01)
        play()
      }
      return b
    }),
  )

  // Summary (a small, escaped subset of markdown)
  $('summaryCard').hidden = !d.summary.trim()
  $('summary').innerHTML = markdown(d.summary)

  renderMetrics(d)
  renderPipeline(d)
  const bits = [d.meta, d.machine && `Maskine: ${d.machine}`, d.trimmedTo && `Klippet til de første ${Math.round(d.trimmedTo)} s`, d.created && `Lavet ${d.created}`]
  $('meta').textContent = bits.filter(Boolean).join(' · ')
}

function setLeft() {
  const sel = $<HTMLSelectElement>('leftSel')
  const t = R.currentTime
  const playing = !R.paused
  L.src = leftURLs[sel.selectedIndex] ?? ''
  $('tagL').textContent = sel.selectedOptions[0]?.text.replace(/\s*\(.*\)$/, '') ?? ''
  L.addEventListener(
    'loadedmetadata',
    () => {
      L.currentTime = t
      if (playing) void L.play().catch(() => {})
    },
    { once: true },
  )
}
$('leftSel').onchange = setLeft

function applyAudio() {
  R.muted = noisy
  A.muted = !noisy
  $('aOrig').classList.toggle('on', noisy)
  $('aClean').classList.toggle('on', !noisy)
  $('aOrig').setAttribute('aria-pressed', String(noisy))
  $('aClean').setAttribute('aria-pressed', String(!noisy))
}
$('aOrig').onclick = () => ((noisy = true), applyAudio())
$('aClean').onclick = () => ((noisy = false), applyAudio())

const followers = () => [L, ...(A.src ? [A] : [])]
function play() {
  void R.play()
  followers().forEach((m) => {
    m.currentTime = R.currentTime
    void m.play().catch(() => {})
  })
}
function pause() {
  R.pause()
  followers().forEach((m) => m.pause())
}
function seek(t: number) {
  pause()
  R.currentTime = t
  followers().forEach((m) => (m.currentTime = t))
}
$('play').onclick = () => (R.paused ? play() : pause())
R.onplay = () => {
  $('play').classList.add('playing')
  $('play').setAttribute('aria-label', 'Pause')
}
R.onpause = R.onended = () => {
  $('play').classList.remove('playing')
  $('play').setAttribute('aria-label', 'Afspil')
  followers().forEach((m) => m.pause())
}
document.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach(
  (b) =>
    (b.onclick = () => {
      ;[R, L, A].forEach((m) => (m.playbackRate = +b.dataset.rate!))
      document.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b))
    }),
)
$<HTMLInputElement>('seek').oninput = (e) => seek((+(e.target as HTMLInputElement).value / 1000) * (R.duration || 0))

let lastSeg: Segment | undefined
;(function tick() {
  const demo = current()
  if (demo) {
    const t = R.currentTime
    const d = R.duration || 0
    for (const m of followers()) if (!R.paused && Math.abs(m.currentTime - t) > 0.08) m.currentTime = t
    $<HTMLInputElement>('seek').value = String(d ? (t / d) * 1000 : 0)
    $('time').textContent = `${fmt(t)} / ${fmt(d)}`
    const seg = demo.segments.find((s) => t >= s.start && t < s.end)
    $('caption').textContent = cc && seg ? seg.text : ''
    if (seg !== lastSeg) {
      lastSeg = seg
      const lines = $('transcript').children
      demo.segments.forEach((s, i) => lines[i]?.classList.toggle('now', s === seg))
      const now = seg && lines[demo.segments.indexOf(seg)]
      if (now && !R.paused) {
        const box = $('transcript')
        const top = (now as HTMLElement).offsetTop - box.offsetTop
        if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40) box.scrollTo({ top: top - 8, behavior: 'smooth' })
      }
    }
  }
  requestAnimationFrame(tick)
})()

// Split line and loupe
const pos = (e: PointerEvent | WheelEvent) => {
  const r = stage.getBoundingClientRect()
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
}
stage.addEventListener('pointerdown', (e) => {
  if (zoom) return
  dragging = true
  stage.setPointerCapture(e.pointerId)
  move(e)
})
stage.addEventListener('pointerup', () => (dragging = false))
stage.addEventListener('pointercancel', () => (dragging = false))
const move = (e: PointerEvent) => {
  const [x, y] = pos(e)
  if (dragging) stage.style.setProperty('--split', `${Math.min(100, Math.max(0, x * 100))}%`)
  if (zoom) {
    stage.style.setProperty('--ox', `${x * 100}%`)
    stage.style.setProperty('--oy', `${y * 100}%`)
  }
}
stage.addEventListener('pointermove', move)
stage.addEventListener(
  'wheel',
  (e) => {
    if (!zoom) return
    e.preventDefault()
    z = Math.min(8, Math.max(1.5, z - e.deltaY * 0.01))
    stage.style.setProperty('--z', String(z))
  },
  { passive: false },
)
const toggleZoom = () => {
  zoom = !zoom
  stage.classList.toggle('zoom', zoom)
  $('zoomBtn').classList.toggle('on', zoom)
  $('zoomBtn').setAttribute('aria-pressed', String(zoom))
}
$('zoomBtn').onclick = toggleZoom
$('ccBtn').onclick = () => {
  cc = !cc
  $('ccBtn').classList.toggle('on', cc)
  $('ccBtn').setAttribute('aria-pressed', String(cc))
}

document.addEventListener('keydown', (e) => {
  if (!demo || $('demo').hidden || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = (e.target as HTMLElement).tagName
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag)) return
  const fps = demo.fps || 25
  if (e.key === ' ') {
    e.preventDefault()
    R.paused ? play() : pause()
  } else if (e.key === 'z' || e.key === 'Z') toggleZoom()
  else if ((e.key === 'a' || e.key === 'A') && A.src) (noisy = !noisy), applyAudio()
  else if (e.key === 'c' || e.key === 'C') $('ccBtn').click()
  else if (e.key === 'ArrowRight') seek(R.currentTime + 1 / fps)
  else if (e.key === 'ArrowLeft') seek(Math.max(0, R.currentTime - 1 / fps))
})

// ── Side panels ──────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/(^|\s)_(.+?)_(?=\s|$|[.,])/g, '$1<em>$2</em>')

function markdown(src: string) {
  let html = ''
  let list = false
  for (const line of src.split('\n')) {
    const li = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/)
    if (li) {
      if (!list) html += '<ul>'
      list = true
      html += `<li>${inline(li[1])}</li>`
      continue
    }
    if (list) html += '</ul>'
    list = false
    const h = line.match(/^#+\s*(.*)/)
    if (h) html += `<p><strong>${inline(h[1])}</strong></p>`
    else if (/^\s*_.*_\s*$/.test(line)) html += `<p class="aid-small">${esc(line.trim().slice(1, -1))}</p>`
    else if (line.trim()) html += `<p>${inline(line)}</p>`
  }
  return html + (list ? '</ul>' : '')
}

function stat(k: string, v: string, delta?: string, good?: boolean) {
  const c = el('div', 'aid-stat')
  c.append(el('div', 'aid-stat-k', k), el('div', 'aid-stat-v', v))
  if (delta) c.append(el('div', `aid-stat-d ${good ? 'good' : 'bad'}`, delta))
  return c
}

function renderMetrics(d: Demo) {
  const cards: HTMLElement[] = []
  const q = d.quality
  if (q.length >= 2) {
    const base = q[0]
    const ai = q[q.length - 1]
    const dS = ai.ssim - base.ssim
    const dP = ai.psnr - base.psnr
    cards.push(stat('Lighed med facit (SSIM)', nf(ai.ssim, 3), `${dS >= 0 ? '+' : '−'}${nf(Math.abs(dS), 3)} mod før`, dS >= 0))
    cards.push(stat('Billedstøj (PSNR)', `${nf(ai.psnr, 1)} dB`, `${dP >= 0 ? '+' : '−'}${nf(Math.abs(dP), 1)} dB mod før`, dP >= 0))
  }
  if (d.wer.length === 2) {
    const [n, c] = d.wer
    cards.push(stat('Fejl i tekst, original lyd', `${nf(n.wer, 1)} %`))
    cards.push(stat('Fejl i tekst, renset lyd', `${nf(c.wer, 1)} %`, `${c.wer <= n.wer ? '−' : '+'}${nf(Math.abs(c.wer - n.wer), 1)} point`, c.wer <= n.wer))
  }
  $('stats').replaceChildren(...cards)
  $('metricsNote').textContent = cards.length
    ? 'Målt mod en kendt original: testvideoen er lavet ren og derefter gjort dårligere med vilje.'
    : 'En rigtig film har ikke noget facit at måle mod — her må øjne og ører dømme.'
}

const DEFAULT_PIPELINE = [
  { kind: 'audio', label: 'Renere lyd', body: 'RNNoise fjerner sus og brum under stemmerne.' },
  { kind: 'upscale', label: 'Skarpere billede', body: 'Real-ESRGAN gør billedet fire gange større og fjerner korn.' },
  { kind: 'transcribe', label: 'Tale til tekst', body: 'Whisper skriver ned, hvad der bliver sagt — på dansk.' },
  { kind: 'summary', label: 'Resumé', body: 'Gemma ser nøglebillederne, læser teksten og fortæller, hvad filmen handler om.' },
]

function renderPipeline(d: Demo | null) {
  const steps = DEFAULT_PIPELINE.map((s) => {
    const done = d?.pipeline.find((p) => p.kind === s.kind)
    return { ...s, label: done?.label ?? s.label, seconds: done?.seconds }
  }).filter((s) => !d || !d.pipeline.length || s.seconds !== undefined)
  $('pipeline').replaceChildren(
    ...steps.map((s, i) => {
      const card = el('div', 'step')
      card.append(el('div', 'step-num', String(i + 1)), el('div', 'step-title', s.label), el('div', 'step-body', s.body))
      if (s.seconds !== undefined) card.append(el('div', 'aid-step-time', `${dur(s.seconds)} på Mac'en`))
      return card
    }),
  )
}

renderPipeline(null)
void listPublished()
initConsent()
