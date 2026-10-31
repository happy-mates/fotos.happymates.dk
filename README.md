# fotos.happymates.dk

Landingsside for foto-digitalisering (dias, negativer, papirbilleder og device-tømning) — drevet af Foreningen Happy Mates (CVR 46371771).

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

## Lokal AI-demo (`/lokal-ai.html`)

Viser, hvad lokal AI kan gøre for gamle film: før/efter med skillelinje, original og renset lyd, undertekster,
transskription, nøglebilleder, resumé, målinger og tid pr. trin. Siden afspiller en *demo-mappe*
(`demo.json` + `media/`), som BakeSafes video-AI-spike laver (`spikes/video-ai/helpers.py handover`,
skill `video-demo-handover` i `surdej-v2/bakesafe`).

- **Vis uden at udgive:** "Åbn demo-mappe" (eller træk mappen ind på siden). Filerne bliver i browseren.
- **Udgiv:** kopiér mappen til `public/ai-demo/<id>/` og tilføj `{"id": "<id>", "title": "<titel>"}` i
  `public/ai-demo/index.json`. `/lokal-ai.html?demo=<id>` åbner den direkte. Kun optagelser, vi har ret til at vise.
  Demoerne kan ligge et andet sted (fx `happy-mates/ai-demo-data`, når det bliver hostet): sæt
  repo-variablen `AI_DEMO_BASE` til adressen (med CORS); tom betyder `/ai-demo/` her på siden.

Design-udkast ligger i [design/](design/).
