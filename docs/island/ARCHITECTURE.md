# Mediterranean portfolio world

The homepage remains an Astro static document. All nine finished frontends, five professional records, localized career copy, contact links and PDF downloads exist in semantic HTML. Three.js progressively enhances that document with a navigable architectural world.

- `src/lib/island/` owns content, translated interface copy, bounded URL parsing and versioned preferences. Canonical projects and original dictionaries remain in their existing source files.
- `src/components/island/` owns accessible navigation and panels. The gallery places completed sites first, filters sectors through ordinary links, and addresses selected work with `#project-{id}`.
- `controller.ts` owns route/history state, focus restoration, preferences and scene lifetime. Its generation token prevents stale asynchronous scene initialization from taking ownership. Lost GPU contexts clear their handle and quality so explicit retry constructs a new scene.
- `scene/world.ts` assembles architecture, vegetation and water. `architecture.ts` builds stepped terraces, the exhibition, studio, timeline and contact pavilion. `construction.ts` supplies geometry construction and static material batching; `materials.ts` owns surface assets; `landscape.ts` batches foliage and rocks into seven draws.
- `camera.ts` frames the composition and retargets a single interruptible transition. `rendering.ts` adds desktop contact occlusion, excluding transparent signage/glass from its depth pass. The low-power path uses a single renderer pass.
- `scene/index.ts` owns rendering, observers, picking and scheduling. Picking uses architecture and terrain batches, excluding decorative vegetation. It pauses while hidden/offscreen and becomes demand-driven with motion disabled. `SceneResources` owns all GPU allocations, late images and cleanup.

The scene uses original geometry, existing verified project screenshots, licensed self-hosted fonts, and one generated travertine material. It does not use the supplied reference as a background. Lightweight posters are actual framebuffer captures from the same scene; run `node scripts/capture-island.mjs http://127.0.0.1:4196` against a local dev server to regenerate them. Capture metrics identify software rendering explicitly.

## Verification

`npm run astro -- check`, `npm run build`, and `npm run test:e2e` are the repository checks. No separate lint command is configured. The immutable preservation fixture must not be regenerated to silence failures. Real WebGL lifecycle tests run on Chromium SwiftShader; they do not constitute hardware FPS measurements. Visual comparison remains a separate gate recorded in `design-qa.md`.
