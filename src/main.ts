import './hm-tokens.css'
import './style.css'
import { initConsent } from './consent'

type Price = { name: string; price: string; unit: string; note: string; featured?: boolean }
type Step = { n: number; title: string; body: string }

const prices: Price[] = [
  { name: 'Dias, negativer og papirbilleder', price: '2 kr.', unit: 'pr. billede inkl. moms', note: 'Vi scanner det hele. Du ser billederne i din portal og vælger selv, hvilke der skal gemmes.', featured: true },
  { name: 'Høj opløsning', price: '10 kr.', unit: 'pr. billede, du gemmer', note: 'Ekstra skarpt på flatbed: 20 kr. Dias koster højst 4 kr. pr. stk. i alt.' },
  { name: 'Video og lyd', price: '50 kr.', unit: 'pr. påbegyndt halve time', note: 'VHS, Hi8, MiniDV, DVD og kassettebånd. Højst 200 kr. pr. videobånd og 100 kr. pr. kassette.' },
  { name: 'Smalfilm', price: '50 kr.', unit: 'pr. lille spole (3")', note: 'Større spoler: 15 kr. pr. minut. Intet startgebyr.' },
  { name: 'Album, aviser og magasiner', price: '12 kr.', unit: 'pr. A4-side', note: 'Større formater scannes i flere felter og sættes sammen. Se prisberegneren.' },
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
