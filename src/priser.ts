// Prismodellen for fotos.happymates.dk — ét sted for alle priser og al prisberegning.
//
// Modulet har ingen afhængigheder (ingen DOM, ingen framework), så det kan bruges
// både af prisberegneren på hjemmesiden og af foto-værktøjet i happymates.ai.
// Alle beløb er i kroner inkl. 25 % moms.

export const PRISER = {
  /** Scanning af dias, negativer og papirbilleder, pr. stk. */
  scan: 2,
  /** Høj opløsning af et billede, kunden vælger at gemme. */
  hoejOpl: 10,
  /** Genscanning på flatbed i stedet for høj opløsning (erstatter de 10 kr.). */
  flatbed: 20,
  /** Dias koster højst dette pr. dias i alt. */
  diasLoft: 4,
  /** Tillæg pr. billede, der tages ud af et album og sættes tilbage. */
  albumTillaeg: 1.5,
  /** Glasplader, høj opløsning direkte. */
  glasplade: 20,
  /** Høj opløsning af en side eller et opslag (inkl. udklip af billeder med tekst). */
  sideHoejOpl: 10,
  /** Lyskorrektion af en side eller et opslag. */
  lyskorrektion: 15,
  /** Video og lyd, pr. påbegyndt halve time spilletid. */
  halvtime: 50,
  /** AI-forbedring af video, pr. påbegyndt halve time. */
  aiHalvtime: 50,
  /** Smalfilm, 3"-spole (ca. 15 m, 3 min.). */
  smalfilmLilleSpole: 50,
  /** Smalfilm på større spoler, pr. minut. */
  smalfilmMinut: 15,
  /** Timepris for hjælp og scanning hjemme hos kunden. */
  time: 400,
  /** Kørsel ved afhentning, levering eller besøg, pr. kørt km. */
  km: 5,
} as const

export const MOMS_ANDEL = 0.2 // 25 % moms = 20 % af prisen inkl. moms

export type Storformat = { id: string; navn: string; maal: string; felter: string; scan: number }

/** A4 er standard på flatbedden. Større formater scannes i flere A4-felter og sættes sammen. */
export const STORFORMATER: Storformat[] = [
  { id: 'a4', navn: 'A4, bog- eller albumside, magasin under A4 (side)', maal: '≤ 21,6 × 29,7 cm', felter: '1', scan: 12 },
  { id: 'mag-u-opslag', navn: 'Magasin under A4, opslag', maal: 'ca. 42 × 28 cm', felter: '2–3', scan: 40 },
  { id: 'mag-o-side', navn: 'Magasin over A4, side', maal: 'ca. 23 × 30 cm', felter: '2', scan: 35 },
  { id: 'mag-o-opslag', navn: 'Magasin over A4, opslag', maal: 'ca. 46 × 30 cm', felter: '4', scan: 55 },
  { id: 'tab-side', navn: 'Avis tabloid, side', maal: 'ca. 28 × 43 cm', felter: '3', scan: 45 },
  { id: 'tab-opslag', navn: 'Avis tabloid, opslag', maal: 'ca. 56 × 43 cm', felter: '6', scan: 75 },
  { id: 'fuld-side', navn: 'Avis fuldformat, side', maal: 'ca. 37,5 × 60 cm', felter: '6–8', scan: 85 },
  { id: 'fuld-opslag', navn: 'Avis fuldformat, opslag', maal: 'ca. 75 × 60 cm', felter: '12', scan: 135 },
]

export type BaandFormat = 'video' | 'kassette' | 'spole'

export const BAAND: Record<BaandFormat, { navn: string; loft: number | null; ai: boolean }> = {
  video: { navn: 'Video: VHS, Hi8, Video8, MiniDV, DVD', loft: 200, ai: true },
  kassette: { navn: 'Lyd: kassettebånd', loft: 100, ai: false },
  spole: { navn: 'Lyd: spolebånd', loft: null, ai: false },
}

export type Linje =
  | { type: 'dias' | 'negativer'; antal: number; hoejOpl: number; flatbed: number }
  | { type: 'papir'; antal: number; hoejOpl: number; flatbed: number; album: number }
  | { type: 'sider'; format: string; antal: number; hoejOpl: number; lys: number }
  | { type: 'glas'; antal: number }
  | { type: 'baand'; format: BaandFormat; antal: number; minutter: number; ai: boolean }
  | { type: 'smalfilm'; smaaSpoler: number; minutter: number }
  | { type: 'timer'; timer: number }
  | { type: 'koersel'; km: number }

export type LinjeType = Linje['type']

export const YDELSER: Record<LinjeType, { navn: string; start: Linje }> = {
  dias: { navn: 'Dias', start: { type: 'dias', antal: 100, hoejOpl: 20, flatbed: 0 } },
  negativer: { navn: 'Negativer', start: { type: 'negativer', antal: 100, hoejOpl: 20, flatbed: 0 } },
  papir: { navn: 'Papirbilleder', start: { type: 'papir', antal: 200, hoejOpl: 50, flatbed: 0, album: 0 } },
  sider: { navn: 'Album- og bogsider, aviser, magasiner', start: { type: 'sider', format: 'a4', antal: 30, hoejOpl: 20, lys: 0 } },
  glas: { navn: 'Glasplader', start: { type: 'glas', antal: 10 } },
  baand: { navn: 'Video og lyd', start: { type: 'baand', format: 'video', antal: 1, minutter: 60, ai: false } },
  smalfilm: { navn: 'Smalfilm', start: { type: 'smalfilm', smaaSpoler: 1, minutter: 0 } },
  timer: { navn: 'Hjælp hjemme (timepris)', start: { type: 'timer', timer: 1 } },
  koersel: { navn: 'Kørsel', start: { type: 'koersel', km: 20 } },
}

export const YDELSE_RAEKKEFOELGE: LinjeType[] = ['dias', 'negativer', 'papir', 'sider', 'glas', 'baand', 'smalfilm', 'timer', 'koersel']

export type Resultat = { total: number; dele: string[]; advarsel?: string }

/** Heltal ≥ 0 (tomme felter og negative tal tæller som 0). */
export function heltal(v: unknown): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Kvarte timer ≥ 0, accepterer dansk komma. */
export function kvartTimer(v: unknown): number {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 4) / 4 : 0
}

function rund(n: number): number {
  return Math.round(n * 100) / 100
}

export function kr(n: number): string {
  const decimaler = Math.round(n * 100) % 100 !== 0
  return n.toLocaleString('da-DK', { minimumFractionDigits: decimaler ? 2 : 0, maximumFractionDigits: 2 }) + ' kr.'
}

function tal(n: number): string {
  return n.toLocaleString('da-DK')
}

export function storformat(id: string): Storformat {
  return STORFORMATER.find((f) => f.id === id) ?? STORFORMATER[0]
}

export function navnFor(l: Linje): string {
  if (l.type === 'sider') return storformat(l.format).navn
  if (l.type === 'baand') return (BAAND[l.format] ?? BAAND.video).navn
  return YDELSER[l.type].navn
}

/** Pris for én linje, med en læsbar udregning. */
export function beregn(l: Linje): Resultat {
  const P = PRISER
  const dele: string[] = []
  let total = 0
  let advarsel: string | undefined

  switch (l.type) {
    case 'dias':
    case 'negativer':
    case 'papir': {
      const antal = heltal(l.antal)
      const hq = heltal(l.hoejOpl)
      const flat = heltal(l.flatbed)
      total = antal * P.scan + hq * P.hoejOpl + flat * P.flatbed
      dele.push(`${tal(antal)} × ${kr(P.scan)}`)
      if (hq) dele.push(`${tal(hq)} × ${kr(P.hoejOpl)}`)
      if (flat) dele.push(`${tal(flat)} × ${kr(P.flatbed)} flatbed`)
      if (l.type === 'papir') {
        const album = heltal(l.album)
        if (album) {
          total += album * P.albumTillaeg
          dele.push(`${tal(album)} × ${kr(P.albumTillaeg)} album`)
        }
      }
      if (hq + flat > antal) advarsel = 'Flere gemte end scannede'
      if (l.type === 'dias' && antal && total > antal * P.diasLoft) {
        total = antal * P.diasLoft
        dele.push(`loft ${kr(P.diasLoft)} pr. dias`)
      }
      break
    }
    case 'sider': {
      const f = storformat(l.format)
      const antal = heltal(l.antal)
      const hq = heltal(l.hoejOpl)
      const lys = heltal(l.lys)
      total = antal * f.scan + hq * P.sideHoejOpl + lys * P.lyskorrektion
      dele.push(`${tal(antal)} × ${kr(f.scan)}`)
      if (hq) dele.push(`${tal(hq)} × ${kr(P.sideHoejOpl)} høj opl.`)
      if (lys) dele.push(`${tal(lys)} × ${kr(P.lyskorrektion)} lys`)
      if (hq > antal || lys > antal) advarsel = 'Flere end antal sider'
      break
    }
    case 'glas': {
      const antal = heltal(l.antal)
      total = antal * P.glasplade
      dele.push(`${tal(antal)} × ${kr(P.glasplade)}`)
      break
    }
    case 'baand': {
      const b = BAAND[l.format] ?? BAAND.video
      const antal = heltal(l.antal)
      const min = heltal(l.minutter)
      const halve = Math.ceil(min / 30)
      const fuld = halve * P.halvtime
      const prBaand = b.loft != null ? Math.min(fuld, b.loft) : fuld
      const ai = b.ai && l.ai ? halve * P.aiHalvtime : 0
      total = antal * (prBaand + ai)
      dele.push(
        `${tal(antal)} bånd à ${tal(min)} min. = ${halve} × ${kr(P.halvtime)}` +
          (prBaand < fuld ? ` → loft ${kr(prBaand)}` : '') +
          ` = ${kr(prBaand)} pr. bånd`,
      )
      if (ai) dele.push(`AI-forbedring ${kr(ai)} pr. bånd`)
      break
    }
    case 'smalfilm': {
      const smaa = heltal(l.smaaSpoler)
      const min = heltal(l.minutter)
      total = smaa * P.smalfilmLilleSpole + min * P.smalfilmMinut
      if (smaa) dele.push(`${tal(smaa)} × ${kr(P.smalfilmLilleSpole)} pr. 3"-spole`)
      if (min) dele.push(`${tal(min)} min. × ${kr(P.smalfilmMinut)}`)
      break
    }
    case 'timer': {
      const t = kvartTimer(l.timer)
      total = t * P.time
      dele.push(`${String(t).replace('.', ',')} t × ${kr(P.time)}`)
      break
    }
    case 'koersel': {
      const km = heltal(l.km)
      total = km * P.km
      dele.push(`${tal(km)} km × ${kr(P.km)}`)
      break
    }
  }
  return { total: rund(total), dele, advarsel }
}

export function beregnAlle(linjer: Linje[]): { resultater: Resultat[]; total: number; moms: number } {
  const resultater = linjer.map(beregn)
  const total = rund(resultater.reduce((s, r) => s + r.total, 0))
  return { resultater, total, moms: rund(total * MOMS_ANDEL) }
}

/** Beregningen som tekst, fx til en mail. */
export function somTekst(titel: string, linjer: Linje[], note = ''): string {
  const { resultater, total, moms } = beregnAlle(linjer)
  const ud = [titel]
  if (note) ud.push(note)
  ud.push('')
  linjer.forEach((l, i) => ud.push(`${navnFor(l)}: ${resultater[i].dele.join(' + ')} = ${kr(resultater[i].total)}`))
  ud.push('')
  ud.push(`I alt: ${kr(total)} inkl. moms (heraf moms ${kr(moms)})`)
  return ud.join('\n')
}
