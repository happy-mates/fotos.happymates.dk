import './hm-tokens.css'
import './style.css'
import { initConsent } from './consent'

type Price = { name: string; price: string; unit: string; note: string; featured?: boolean }
type Step = { n: number; title: string; body: string }

const prices: Price[] = [
  { name: 'Dias — topkvalitet', price: '10 kr.', unit: 'pr. stk. inkl. moms', note: '4000 DPI + infrarød støv- og ridsefjernelse.', featured: true },
  { name: 'Dias — kvikscanning', price: '3,12 kr.', unit: 'pr. stk. inkl. moms', note: 'Hurtig scanning i god kvalitet — oplagt til store samlinger og deling på skærm.' },
  { name: 'Negativer', price: '12,50 kr.', unit: 'pr. billede inkl. moms', note: '4000 DPI + infrarød. Send hele strimler — vi klipper ikke.' },
  { name: 'Papirbilleder', price: '12,50 kr.', unit: 'pr. stk. inkl. moms', note: 'Høj opløsning, op til A4, med let justering af farver og beskæring.' },
  { name: 'DVD til MP4', price: '62,50 kr.', unit: 'pr. påbegyndt halve time inkl. moms', note: 'Hjemmevideoer overføres til MP4 — klar til at se og dele.' },
  { name: 'Smalfilm, videobånd, lyd og glasplader', price: 'Tilbud', unit: 'fast pris inkl. moms', note: 'Vi giver dig en fast pris, når vi kender omfanget. Kontakt os.' },
  { name: 'Timepris', price: '400 kr.', unit: 'pr. time inkl. moms', note: 'Hjælp til telefoner, computere og backup — samt scanning hjemme hos jer.' },
]

const steps: Step[] = [
  { n: 1, title: 'Aflevering', body: 'Kom forbi med kassen, lad os hente den — eller få os til at scanne hjemme hos dig.' },
  { n: 2, title: 'Vi digitaliserer og tjekker', body: 'Alt digitaliseres i høj kvalitet og tjekkes manuelt.' },
  { n: 3, title: 'Sorteret og navngivet', body: 'Du får det hele i mapper — efter år, æske eller emne. Du bestemmer.' },
  { n: 4, title: 'Gemt, hvor du vil', body: 'På USB, harddisk, din computer eller din egen sky — vi hjælper dig med at få det gemt dér, hvor du vil have det.' },
]

document.querySelector<HTMLDivElement>('#price-grid')!.innerHTML = prices
  .map(
    (p) => `
    <div class="price-card${p.featured ? ' featured' : ''}">
      <div class="price-name">${p.name}</div>
      <div class="price-amount">${p.price}</div>
      <div class="price-unit">${p.unit}</div>
      <div class="price-note-text">${p.note}</div>
    </div>`,
  )
  .join('')

document.querySelector<HTMLDivElement>('#steps-grid')!.innerHTML = steps
  .map(
    (s) => `
    <div class="step">
      <div class="step-num">${s.n}</div>
      <div class="step-title">${s.title}</div>
      <div class="step-body">${s.body}</div>
    </div>`,
  )
  .join('')

initConsent()
