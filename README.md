# Khalil Ben Ali — Portfolio

A multilingual Astro portfolio with a progressively loaded Three.js Mediterranean world, an accessible project exhibition, and independent résumé pages. The lightweight view and the HTML document retain the portfolio content without requiring WebGL or JavaScript.

The world stays visible throughout the portfolio. Navigation moves into the gallery, studio, career terrace or contact pavilion beside a scrolling reading panel. Project selection updates the gallery's central display; career dates highlight the corresponding physical milestone. On narrow screens, the room sits above the reading panel, with ordinary links and motion controls still available.

Use Node 22.23.1 from `.nvmrc` and npm 10.9.8. The package supports Node 22.22 or later.

```sh
nvm use
npm ci
npm run dev
npm run astro -- check
npm run build
npm run test:e2e
npm run preview
```

GitHub Pages deployment uses the existing workflow and runs its checks before publishing from `main`. Visual acceptance is a separate gate; passing a build or test suite does not establish a match to the reference.

- [Scene architecture and navigation](docs/island/ARCHITECTURE.md)
- [Asset provenance and licenses](docs/island/ASSET_PROVENANCE.md)
- [Baked lighting and regeneration](docs/island/BAKE.md)
- [Destination design audit](docs/island/qa/SECTION_AUDIT.md)
- [Current visual QA status](design-qa.md)

No production package dependency was added for the reference implementation. Each checkout keeps its Vite optimizer cache in `.astro/vite-cache`, including worktrees that share installed dependencies.
