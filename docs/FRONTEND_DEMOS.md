# Verified frontend experiences

The frontend gallery uses real screenshots of original applications built in November 2026. These entries have working public GitHub Pages demos; brands, inventory, prices and booking/checkout flows are illustrative. No private client implementation or customer data is used.

| Project      | Sector                   | Live demo                                             | Source screenshot                                             |
| ------------ | ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------- |
| Maison Sol   | Hospitality              | https://khalilbenali1.github.io/maison-sol-react/     | `maison-sol-react/docs/screenshots/home-desktop.jpg`          |
| Sora         | Dining                   | https://khalilbenali1.github.io/sora-angular/         | `sora-angular/docs/screenshots/home-desktop.jpg`              |
| Atelier No.8 | Fashion / retail         | https://khalilbenali1.github.io/atelier-no8-nuxt/     | `atelier-no8-nuxt/docs/screenshots/home-desktop.jpg`          |
| Erden Vaux   | Luxury leather goods     | https://khalilbenali1.github.io/erdenvaux-bags-next/  | `erdenvaux-bags-next/docs/screenshots/home-desktop.png`       |
| Veyli Colour | Beauty / makeup          | https://khalilbenali1.github.io/veyli-colour-nuxt/    | `veyli-colour-nuxt/docs/screenshots/home-desktop.jpg`         |
| Forma        | Architecture / interiors | https://khalilbenali1.github.io/forma-astro/          | `forma-astro/docs/screenshots/home-desktop.png`               |
| Roam         | Travel / planning        | https://khalilbenali1.github.io/roam-sveltekit/       | `roam-sveltekit/docs/screenshots/planner-desktop.png`         |
| Prism        | Design systems           | https://khalilbenali1.github.io/prism-web-components/ | `prism-web-components/docs/screenshots/workbench-desktop.png` |

Each source repository documents its architecture, checks, asset/font provenance, actual browser screenshots and meaningful limitations. Gallery images are optimized JPEG derivatives of the actual renders, without redesigning their content. New entries must be publicly verified before being added.

The existing English, French and Italian portfolio pages share the typed catalogue in `src/lib/frontend-projects.ts`; the gallery owns only presentation. Its image-led card layout remains consistent while the showcased applications have distinct compositions and unique font pairings.

Veyli Colour was added after its main release checks and Pages deployment passed, followed by all 18 public Chromium release cases and an additional native-touch colour-story → edited €68 bundle → €73 checkout → immutable confirmation journey. Its actual public capture is the source of the optimized gallery image. The source repository records 38 unit/store/composable checks, 54 cross-browser cases, original image/font provenance and the local demo's limits.
