import './hm-tokens.css'
import './style.css'
import './prisberegner.css'
import { initConsent } from './consent'
import {
  BAAND,
  PRISER,
  STORFORMATER,
  YDELSER,
  YDELSE_RAEKKEFOELGE,
  beregn,
  beregnAlle,
  kr,
  navnFor,
  somTekst,
  type BaandFormat,
  type Linje,
  type LinjeType,
} from './priser'

// ── Felter pr. ydelse ─────────────────────────────────────────────────────
type Felt = { key: string; label: string; hjaelp?: string; decimal?: boolean }

const FELTER: Record<LinjeType, Felt[]> = {
  dias: [
    { key: 'antal', label: 'Antal dias' },
    { key: 'hoejOpl', label: 'Gemmes i høj opløsning', hjaelp: 'Et skøn — du vælger først, når du har set dem.' },
    { key: 'flatbed', label: 'Heraf ekstra skarpt på flatbed', hjaelp: '20 kr. i stedet for 10 kr.' },
  ],
  negativer: [
    { key: 'antal', label: 'Antal negativer' },
    { key: 'hoejOpl', label: 'Gemmes i høj opløsning', hjaelp: 'Et skøn — du vælger først, når du har set dem.' },
    { key: 'flatbed', label: 'Heraf ekstra skarpt på flatbed', hjaelp: '20 kr. i stedet for 10 kr.' },
  ],
  papir: [
    { key: 'antal', label: 'Antal billeder' },
    { key: 'hoejOpl', label: 'Gemmes i høj opløsning', hjaelp: 'Et skøn — du vælger først, når du har set dem.' },
    { key: 'flatbed', label: 'Heraf ekstra skarpt på flatbed', hjaelp: '20 kr. i stedet for 10 kr.' },
    { key: 'album', label: 'Heraf sidder i album', hjaelp: 'Vi tager dem ud og sætter dem tilbage.' },
  ],
  sider: [
    { key: 'antal', label: 'Antal sider eller opslag' },
    { key: 'hoejOpl', label: 'Gemmes i høj opløsning', hjaelp: 'Med hvert billede klippet ud med teksten.' },
    { key: 'lys', label: 'Med lyskorrektion', hjaelp: 'Fx gulnet avispapir.' },
  ],
  glas: [{ key: 'antal', label: 'Antal glasplader' }],
  baand: [
    { key: 'antal', label: 'Antal bånd' },
    { key: 'minutter', label: 'Minutter pr. bånd', hjaelp: 'Spilletid, ikke båndets længde. Et skøn er fint.' },
  ],
  smalfilm: [
    { key: 'smaaSpoler', label: 'Små spoler (3", ca. 15 m)' },
    { key: 'minutter', label: 'Minutter på større spoler', hjaelp: '5"-spole ≈ 13 min., 7"-spole ≈ 27 min.' },
  ],
  timer: [{ key: 'timer', label: 'Timer', decimal: true }],
  koersel: [{ key: 'km', label: 'Kørte km i alt', hjaelp: 'Ud og hjem tilsammen.' }],
}

// ── Tilstand ──────────────────────────────────────────────────────────────
type Raekke = { id: string; linje: Linje }
type Gemt = { id: string; navn: string; linjer: Linje[]; total: number; gemt: string }

const LAGER = 'hm-prisberegninger'
const uid = () => Math.random().toString(36).slice(2, 10)
const kopi = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const EKSEMPEL: Linje[] = [
  { type: 'dias', antal: 300, hoejOpl: 60, flatbed: 0 },
  { type: 'baand', format: 'video', antal: 2, minutter: 90, ai: false },
]

let raekker: Raekke[] = EKSEMPEL.map((l) => ({ id: uid(), linje: kopi(l) }))
let aabenId: string | null = null
let valgte = new Set<string>()
let sletVenter: string[] | null = null

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | ((e: Event) => void) | null | undefined> = {},
  kids: (Node | string | null)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'text') el.textContent = String(v)
    else if (k === 'class') el.className = String(v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of kids) if (c != null) el.append(c)
  return el
}

// ── Gemte beregninger (kun i browseren) ───────────────────────────────────
function hentGemte(): Gemt[] {
  try {
    const raw = localStorage.getItem(LAGER)
    const data: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? (data as Gemt[]) : []
  } catch {
    return []
  }
}
function skrivGemte(liste: Gemt[]): boolean {
  try {
    localStorage.setItem(LAGER, JSON.stringify(liste))
    return true
  } catch {
    return false
  }
}

// ── Beregner ──────────────────────────────────────────────────────────────
function renderAdders() {
  const box = $('pb-adders')
  box.replaceChildren(
    ...YDELSE_RAEKKEFOELGE.map((t) =>
      h('button', {
        type: 'button',
        class: 'pb-chip',
        text: YDELSER[t].navn,
        onclick: () => {
          const r = { id: uid(), linje: kopi(YDELSER[t].start) }
          raekker.push(r)
          renderLines()
          document.querySelector<HTMLInputElement>(`[data-line="${r.id}"] input, [data-line="${r.id}"] select`)?.focus()
        },
      }),
    ),
  )
}

function inputFelt(r: Raekke, f: Felt) {
  const id = `pb-${r.id}-${f.key}`
  const felter = r.linje as unknown as Record<string, unknown>
  return h('label', { class: 'pb-field', for: id }, [
    f.label,
    h('input', {
      type: 'number',
      id,
      min: '0',
      step: f.decimal ? '0.25' : '1',
      inputmode: f.decimal ? 'decimal' : 'numeric',
      value: String(felter[f.key] ?? 0),
      oninput: (e) => {
        felter[f.key] = (e.target as HTMLInputElement).value
        opdater()
      },
    }),
    f.hjaelp ? h('span', { class: 'pb-hint', text: f.hjaelp }) : null,
  ])
}

function renderLines() {
  const box = $('pb-lines')
  if (!raekker.length) {
    box.replaceChildren(h('div', { class: 'pb-empty', text: 'Vælg det, du har, ovenfor — fx dias eller videobånd.' }))
    opdater()
    return
  }
  box.replaceChildren(
    ...raekker.map((r) => {
      const l = r.linje
      const felter = h('div', { class: 'pb-fields' })
      if (l.type === 'sider') {
        const id = `pb-${r.id}-format`
        const sel = h(
          'select',
          {
            id,
            onchange: (e) => {
              l.format = (e.target as HTMLSelectElement).value
              opdater()
            },
          },
          STORFORMATER.map((f) => h('option', { value: f.id, text: `${f.navn} — ${kr(f.scan)}`, selected: f.id === l.format })),
        )
        felter.append(h('label', { class: 'pb-field pb-wide', for: id }, ['Format', sel]))
      }
      if (l.type === 'baand') {
        const id = `pb-${r.id}-format`
        const sel = h(
          'select',
          {
            id,
            onchange: (e) => {
              l.format = (e.target as HTMLSelectElement).value as BaandFormat
              renderLines()
            },
          },
          (Object.keys(BAAND) as BaandFormat[]).map((k) => h('option', { value: k, text: BAAND[k].navn, selected: k === l.format })),
        )
        felter.append(h('label', { class: 'pb-field pb-wide', for: id }, ['Hvilke bånd?', sel]))
      }
      FELTER[l.type].forEach((f) => felter.append(inputFelt(r, f)))
      if (l.type === 'baand' && BAAND[l.format]?.ai) {
        const id = `pb-${r.id}-ai`
        felter.append(
          h('label', { class: 'pb-check pb-wide', for: id }, [
            h('input', {
              type: 'checkbox',
              id,
              checked: l.ai,
              onchange: (e) => {
                l.ai = (e.target as HTMLInputElement).checked
                opdater()
              },
            }),
            `Forbedr med lokal AI (+${kr(PRISER.aiHalvtime)} pr. påbegyndt ½ time)`,
          ]),
        )
      }
      return h('div', { class: 'pb-line', 'data-line': r.id }, [
        h('div', { class: 'pb-line-head' }, [
          h('h3', { id: `pb-${r.id}-navn`, text: navnFor(l) }),
          h('button', {
            type: 'button',
            class: 'pb-btn pb-btn-ghost',
            'aria-label': `Fjern ${navnFor(l)}`,
            text: 'Fjern',
            onclick: () => {
              raekker = raekker.filter((x) => x !== r)
              renderLines()
            },
          }),
        ]),
        felter,
        h('div', { class: 'pb-line-foot' }, [h('div', { class: 'pb-calc', id: `pb-${r.id}-calc` }), h('div', { class: 'pb-amount', id: `pb-${r.id}-amt` })]),
      ])
    }),
  )
  opdater()
}

function titel(): string {
  return $<HTMLInputElement>('pb-navn').value.trim() || 'Min prisberegning'
}

function opdater() {
  const { total, moms } = beregnAlle(raekker.map((r) => r.linje))
  for (const r of raekker) {
    const res = beregn(r.linje)
    const calc = document.getElementById(`pb-${r.id}-calc`)
    if (calc) {
      calc.replaceChildren(res.dele.join(' + ') || '—')
      if (res.advarsel) calc.append(' · ', h('span', { class: 'pb-warn', text: res.advarsel }))
    }
    const amt = document.getElementById(`pb-${r.id}-amt`)
    if (amt) amt.textContent = kr(res.total)
    const navn = document.getElementById(`pb-${r.id}-navn`)
    if (navn) navn.textContent = navnFor(r.linje)
  }
  $('pb-total').textContent = kr(total)
  $('pb-moms').textContent = `heraf moms ${kr(moms)}`
  const tekst = somTekst(`${titel()} — beregnet på fotos.happymates.dk`, raekker.map((r) => r.linje))
  const body = `Hej Happy Mates\n\nJeg vil gerne have et tilbud ud fra denne beregning:\n\n${tekst}\n\nMit navn:\nTelefon:\nBedste tidspunkt at ringe:\n`
  $<HTMLAnchorElement>('pb-send').href = `mailto:fotos@happymates.dk?subject=${encodeURIComponent('Prisberegning: ' + titel())}&body=${encodeURIComponent(body)}`
  $<HTMLButtonElement>('pb-gem').textContent = aabenId ? 'Gem ændringer' : 'Gem'
}

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer: number | undefined
function toast(msg: string) {
  let t = document.getElementById('pb-toast')
  if (!t) {
    t = h('div', { id: 'pb-toast', class: 'pb-toast', role: 'status', 'aria-live': 'polite' })
    document.body.append(t)
  }
  t.textContent = msg
  t.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (t) t.hidden = true
  }, 2600)
}

// ── Mine beregninger ──────────────────────────────────────────────────────
function renderGemte() {
  const liste = hentGemte()
  const ids = new Set(liste.map((g) => g.id))
  valgte = new Set([...valgte].filter((id) => ids.has(id)))
  $('pb-saved-count').textContent = liste.length ? `${liste.length}` : ''
  $('pb-saved-bar').hidden = liste.length === 0
  const alle = $<HTMLInputElement>('pb-alle')
  alle.checked = liste.length > 0 && valgte.size === liste.length
  alle.indeterminate = valgte.size > 0 && valgte.size < liste.length
  const sletKnap = $<HTMLButtonElement>('pb-slet-valgte')
  sletKnap.disabled = valgte.size === 0
  sletKnap.textContent = valgte.size ? `Slet valgte (${valgte.size})` : 'Slet valgte'

  const box = $('pb-saved-list')
  if (!liste.length) {
    box.replaceChildren(h('div', { class: 'pb-empty', text: 'Ingen gemte beregninger endnu.' }))
    return
  }
  box.replaceChildren(
    ...liste.map((g) => {
      const cid = `pb-valg-${g.id}`
      let dato = ''
      try {
        dato = new Date(g.gemt).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
      } catch {
        /* ugyldig dato */
      }
      return h('div', { class: 'pb-saved-item' + (g.id === aabenId ? ' is-open' : '') }, [
        h('input', {
          type: 'checkbox',
          id: cid,
          'aria-label': `Vælg ${g.navn}`,
          checked: valgte.has(g.id),
          onchange: (e) => {
            if ((e.target as HTMLInputElement).checked) valgte.add(g.id)
            else valgte.delete(g.id)
            renderGemte()
          },
        }),
        h('label', { for: cid, class: 'pb-saved-name', text: g.navn }),
        h('span', { class: 'pb-saved-sum', text: kr(Number(g.total) || 0) }),
        h('span', { class: 'pb-saved-info', text: dato }),
        h('div', { class: 'pb-saved-acts' }, [
          h('button', {
            type: 'button',
            class: 'pb-btn pb-btn-sm',
            text: 'Åbn',
            onclick: () => {
              raekker = (g.linjer || []).map((l) => ({ id: uid(), linje: kopi(l) }))
              aabenId = g.id
              $<HTMLInputElement>('pb-navn').value = g.navn
              renderLines()
              renderGemte()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            },
          }),
          h('button', { type: 'button', class: 'pb-btn pb-btn-sm pb-btn-danger', text: 'Slet', onclick: () => spoergSlet([g.id]) }),
        ]),
      ])
    }),
  )
}

function spoergSlet(ids: string[]) {
  if (!ids.length) return
  sletVenter = ids
  const navn = hentGemte().find((g) => g.id === ids[0])?.navn ?? 'beregningen'
  $('pb-confirm-tekst').textContent = ids.length === 1 ? `Slet “${navn}”?` : `Slet ${ids.length} beregninger?`
  $('pb-confirm').hidden = false
  $<HTMLButtonElement>('pb-confirm-nej').focus()
}

function gem() {
  const liste = hentGemte()
  const linjer = raekker.map((r) => kopi(r.linje))
  const post: Gemt = {
    id: aabenId ?? uid(),
    navn: titel(),
    linjer,
    total: beregnAlle(linjer).total,
    gemt: new Date().toISOString(),
  }
  const i = liste.findIndex((g) => g.id === post.id)
  if (i >= 0) liste[i] = post
  else liste.unshift(post)
  if (!skrivGemte(liste)) {
    toast('Din browser tillader ikke at gemme. Brug “Kopiér” i stedet.')
    return
  }
  aabenId = post.id
  $<HTMLInputElement>('pb-navn').value = post.navn
  opdater()
  renderGemte()
  toast(i >= 0 ? 'Ændringer gemt' : 'Beregning gemt')
}

// ── Prisliste ─────────────────────────────────────────────────────────────
function tabel(hoved: string[], raekkerTekst: string[][], tal: number[]) {
  const cls = (i: number) => (tal.includes(i) ? 'pb-n' : null)
  return h('div', { class: 'pb-table-wrap' }, [
    h('table', { class: 'pb-table' }, [
      h('thead', {}, [h('tr', {}, hoved.map((x, i) => h('th', { class: cls(i), text: x })))]),
      h('tbody', {}, raekkerTekst.map((r) => h('tr', {}, r.map((x, i) => h('td', { class: cls(i), text: x }))))),
    ]),
  ])
}
function kort(titelTekst: string, tekst: string | null, indhold: Node, fod: string | null) {
  return h('div', { class: 'pb-price-card' }, [
    h('h3', { text: titelTekst }),
    tekst ? h('p', { text: tekst }) : null,
    indhold,
    fod ? h('p', { class: 'pb-small', text: fod }) : null,
  ])
}
function renderPrisliste() {
  const P = PRISER
  $('pb-price-grid').replaceChildren(
    kort(
      'Dias, negativer og papirbilleder',
      'Vi scanner det hele. Du vælger i din portal, hvad der skal gemmes i høj opløsning.',
      tabel(
        ['Pr. stk.', 'Scanning', 'Høj opløsning', 'Flatbed'],
        ['Dias', 'Negativer', 'Papirbilleder'].map((n) => [n, kr(P.scan), kr(P.hoejOpl), kr(P.flatbed)]),
        [1, 2, 3],
      ),
      `Flatbed er ekstra skarpt og koster 20 kr. i stedet for 10 kr. Dias koster højst ${kr(P.diasLoft)} pr. dias i alt.`,
    ),
    kort(
      'Albums og glasplader',
      null,
      tabel(
        ['Ydelse', 'Pris'],
        [
          ['Billede taget ud af album og sat tilbage', `+${kr(P.albumTillaeg)} pr. billede`],
          ['Albumside eller bogside, A4', `${kr(12)} + ${kr(P.sideHoejOpl)} for høj opløsning`],
          ['Glasplader i høj opløsning', `${kr(P.glasplade)} pr. stk.`],
        ],
        [1],
      ),
      'Fastklæbede billeder scannes som hel side, og hvert billede klippes ud med teksten.',
    ),
    kort(
      'Aviser og magasiner',
      'Større end A4 scannes i flere felter og sættes sammen til én fil.',
      tabel(['Format', 'Mål', 'Pris'], STORFORMATER.map((f) => [f.navn, f.maal, kr(f.scan)]), [2]),
      `Høj opløsning +${kr(P.sideHoejOpl)} og lyskorrektion +${kr(P.lyskorrektion)} pr. side eller opslag.`,
    ),
    kort(
      'Video og lyd',
      'Pr. påbegyndt halve time spilletid.',
      tabel(
        ['Bånd', 'Pris', 'Højst pr. bånd'],
        (Object.keys(BAAND) as BaandFormat[]).map((k) => [BAAND[k].navn, `${kr(P.halvtime)} pr. ½ time`, BAAND[k].loft ? kr(BAAND[k].loft!) : '—']),
        [2],
      ),
      `Forbedring af video med lokal AI: +${kr(P.aiHalvtime)} pr. påbegyndt ½ time. Du får også den uredigerede fil i bedst mulig kvalitet.`,
    ),
    kort(
      'Smalfilm',
      '8 mm og Super 8.',
      tabel(
        ['Spole', 'Pris'],
        [
          ['Lille spole (3", ca. 15 m, 3 min.)', kr(P.smalfilmLilleSpole)],
          ['Større spoler', `${kr(P.smalfilmMinut)} pr. minut`],
        ],
        [1],
      ),
      null,
    ),
    kort(
      'Hjælp hjemme hos dig',
      'Telefoner, computere, backup — eller scanning hjemme hos dig.',
      tabel(
        ['Ydelse', 'Pris'],
        [
          ['Timepris', `${kr(P.time)} pr. time`],
          ['Kørsel ved afhentning, levering eller besøg', `${kr(P.km)} pr. kørt km`],
        ],
        [1],
      ),
      null,
    ),
  )
}

// ── Start ─────────────────────────────────────────────────────────────────
$('pb-navn').addEventListener('input', () => opdater())
$('pb-reset').addEventListener('click', () => {
  raekker = []
  aabenId = null
  $<HTMLInputElement>('pb-navn').value = ''
  renderLines()
  renderGemte()
})
$('pb-gem').addEventListener('click', gem)
$('pb-kopier').addEventListener('click', async () => {
  const tekst = somTekst(`${titel()} — fotos.happymates.dk`, raekker.map((r) => r.linje))
  try {
    await navigator.clipboard.writeText(tekst)
    toast('Kopieret')
  } catch {
    toast('Kunne ikke kopiere')
  }
})
$('pb-alle').addEventListener('change', (e) => {
  valgte = (e.target as HTMLInputElement).checked ? new Set(hentGemte().map((g) => g.id)) : new Set()
  renderGemte()
})
$('pb-slet-valgte').addEventListener('click', () => spoergSlet([...valgte]))
$('pb-confirm-nej').addEventListener('click', () => {
  sletVenter = null
  $('pb-confirm').hidden = true
})
$('pb-confirm-ja').addEventListener('click', () => {
  const ids = new Set(sletVenter ?? [])
  sletVenter = null
  $('pb-confirm').hidden = true
  if (!ids.size) return
  skrivGemte(hentGemte().filter((g) => !ids.has(g.id)))
  ids.forEach((id) => valgte.delete(id))
  if (aabenId && ids.has(aabenId)) aabenId = null
  opdater()
  renderGemte()
  toast(ids.size === 1 ? 'Beregning slettet' : `${ids.size} beregninger slettet`)
})

renderAdders()
renderLines()
renderGemte()
renderPrisliste()
initConsent()
