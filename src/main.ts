import './hm-tokens.css'
import './style.css'

type Price = { name: string; price: string; unit: string; note: string; featured?: boolean }
type Step = { n: number; title: string; body: string }

const prices: Price[] = [
  { name: 'Dias', price: '12,50 kr.', unit: 'pr. stk. inkl. moms', note: '4000 DPI + infrarød støv- og ridsefjernelse.', featured: true },
  { name: 'Negativer', price: '12,50 kr.', unit: 'pr. billede inkl. moms', note: '4000 DPI + infrarød — hele strimler modtages.' },
  { name: 'Papirbilleder', price: '12,50 kr.', unit: 'pr. stk. inkl. moms', note: 'Høj opløsning, op til A4, let billedjustering.' },
  { name: 'Timepris', price: '400 kr.', unit: 'pr. time inkl. moms', note: 'Device-hjælp, Google Photos-opsætning — og scanning hos jer selv på ren timebasis.' },
]

const steps: Step[] = [
  { n: 1, title: 'Aflever, vi henter — eller vi kommer til jer', body: 'Kom forbi med kassen, vi henter (kørsel efter statens takst) — eller vi scanner hjemme hos jer på timebasis.' },
  { n: 2, title: 'Vi scanner og tjekker', body: 'Hvert billede scannes i topkvalitet og kvalitetstjekkes manuelt.' },
  { n: 3, title: 'Sorteret og navngivet', body: 'Du får det hele i mapper — pr. år, æske eller emne, som du vil.' },
  { n: 4, title: 'Sikret i skyen', body: 'Vi lægger det i Google Photos og sætter automatisk backup op.' },
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
