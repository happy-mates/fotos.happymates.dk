# Plan: Vite-app + GitHub Pages for fotos.happymates.dk

## Fase 1 — Vite-app (scaffold + landingsside)
- [x] Scaffold Vite (vanilla-ts) i roden: package.json, tsconfig.json, vite.config.ts, index.html, src/
- [x] Kopiér design-tokens (colors_and_type.css) og assets (logo, foto) ind i appen
- [x] Implementér landingssiden fra design/Hjemmeside - Foto-digitalisering.dc.html (priser/steps renderes fra data i main.ts)
- [x] public/CNAME med fotos.happymates.dk (custom domain → base '/')
- [x] npm install + npm run build verificeret lokalt (+ visuel kontrol i browser)

## Fase 2 — GitHub Actions → GitHub Pages
- [x] .gitignore
- [x] .github/workflows/deploy.yml (build + actions/deploy-pages ved push til main)

## Fase 3 — Repo + publicering
- [ ] git init (main) + første commit
- [ ] Opret happy-mates/fotos.happymates.dk med gh (public)
- [ ] Aktivér GitHub Pages (build_type=workflow) + custom domain fotos.happymates.dk via gh api
- [ ] Push og verificér at workflow kører grønt (gh run view --json conclusion)
- [ ] DNS: fotos.happymates.dk skal have CNAME-record → happy-mates.github.io (manuelt hos DNS-udbyder)
