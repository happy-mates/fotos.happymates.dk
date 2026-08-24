# fotos.happymates.dk

Landingsside for foto-digitalisering (dias, negativer, papirbilleder og device-tømning) — drevet af Mikkel G. H. Johansen foto og it med støtte fra Happy Mates.

## Udvikling

```sh
npm install
npm run dev      # lokal udviklingsserver
npm run build    # produktion → dist/
npm run preview  # preview af build
```

## Deploy

Push til `main` bygger og deployer automatisk til GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

Custom domain: `fotos.happymates.dk` (public/CNAME). DNS skal pege med en CNAME-record på `happy-mates.github.io`.

Design-udkast ligger i [design/](design/).
