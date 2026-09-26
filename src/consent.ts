// Cookie-samtykke: Google Analytics (gtag.js) hentes først, når besøgende har sagt ja.
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = 'G-CR8FF1D97V'
const CONSENT_KEY = 'hm-consent'

window.dataLayer = window.dataLayer || []
window.gtag = function () {
  // gtag.js kræver selve arguments-objektet, ikke et array
  window.dataLayer.push(arguments)
}
window.gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
})

let gaLoaded = false

function loadAnalytics() {
  window.gtag('consent', 'update', { analytics_storage: 'granted' })
  if (gaLoaded) return
  gaLoaded = true
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

function revokeAnalytics() {
  window.gtag('consent', 'update', { analytics_storage: 'denied' })
  // Slet eksisterende _ga-cookies på alle domæneniveauer (fx fotos.happymates.dk og .happymates.dk)
  const parts = location.hostname.split('.')
  const domains = parts.map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'))
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim()
    if (!name.startsWith('_ga')) continue
    document.cookie = `${name}=; Max-Age=0; path=/`
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${d}`
  }
}

export function initConsent() {
  const banner = document.createElement('div')
  banner.className = 'cookie-banner'
  banner.setAttribute('role', 'dialog')
  banner.setAttribute('aria-label', 'Cookie-samtykke')
  banner.hidden = true
  banner.innerHTML = `
    <p class="cookie-text">Må vi bruge cookies til anonym besøgsstatistik (Google Analytics)? Ingen annoncer — og siden virker lige godt, hvis du siger nej. Du kan altid ændre dit valg under „Cookie-indstillinger" nederst på siden. <a href="/privatlivspolitik.html#cookies">Læs mere om cookies</a></p>
    <div class="cookie-actions">
      <button class="btn btn-outline" type="button" data-consent="denied">Nej tak</button>
      <button class="btn btn-primary" type="button" data-consent="granted">Ja tak</button>
    </div>`
  document.body.appendChild(banner)

  const stored = localStorage.getItem(CONSENT_KEY)
  if (stored === 'granted') loadAnalytics()
  else if (stored === null) banner.hidden = false

  banner.addEventListener('click', (e) => {
    const choice = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-consent]')?.dataset.consent
    if (!choice) return
    localStorage.setItem(CONSENT_KEY, choice)
    if (choice === 'granted') loadAnalytics()
    else revokeAnalytics()
    banner.hidden = true
  })

  document.querySelectorAll('[data-cookie-settings]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault()
      banner.hidden = false
      banner.querySelector<HTMLButtonElement>('[data-consent="denied"]')?.focus()
    }),
  )
}
