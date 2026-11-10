# Khalil Ben Ali — Portfolio

A multilingual Astro portfolio whose homepage is a night road through a ruined keep, drawn with Three.js. Scrolling walks the camera from the gate, through the nave and courtyard, up the stair to a signal fire, and each fire lights as it is reached. Every project, the career, the contact details and the résumé pages are ordinary HTML over that scene, so the portfolio is complete without WebGL or JavaScript.

The world is procedural: `src/scripts/keep/world.ts` builds one merged stone mesh from primitives, and `scene.ts` renders it with a sky, instanced flames and two point clouds in five draw calls, with no models or textures to download. `main.ts` maps the scroll position to the road, keeps the current place and career markers in step, and holds the motion preference. The renderer loads after first paint, lowers its resolution before it drops frames, and stops when the tab is hidden. `?view=lite`, the Save-Data hint or a missing or lost graphics context leave a painted night sky in its place; the motion switch and the system reduced-motion setting turn the scene into a still picture that follows the scroll.

On wide screens the reading column sits on the left and the road on the right. On phones the road fills the top of the screen and the four places move to a bar at the bottom.

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

GitHub Pages deployment uses the existing workflow and runs its checks before publishing from `main`. `tests/e2e/keep-scene.spec.ts` runs real WebGL through software Chromium; `keep.spec.ts` covers the interface in Chromium and WebKit; `island-preservation.spec.ts` is the content contract and its fixture must not be regenerated to make a failure pass.

The earlier Mediterranean island homepage is no longer routed. Its sources (`src/components/island`, `src/scripts/island`, `src/styles/island*.css`), assets (`public/island`) and documents (`docs/island`, `design-qa.md`) are still in the repository; `src/lib/island` continues to supply project data to the keep.

No production package dependency was added for the keep. Each checkout keeps its Vite optimizer cache in `.astro/vite-cache`, including worktrees that share installed dependencies.
