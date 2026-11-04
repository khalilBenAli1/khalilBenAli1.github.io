# Mediterranean portfolio world

The homepage is an Astro static document. All nine finished frontend applications, the professional records, localized career copy, contact links, résumé pages and PDF downloads remain in semantic HTML. Three.js progressively enhances that document with a navigable architectural world.

## Module boundaries

| Area                                                 | Responsibility                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/island/`                                    | Content adapters, translated interface copy, bounded URL parsing and versioned preferences. Canonical project data and original dictionaries remain in their existing files.                                                             |
| `src/components/island/`                             | Accessible navigation and destination panels. Completed websites appear first in the gallery; sector links and `#project-{id}` URLs control filters and details.                                                                         |
| `controller.ts`                                      | URL/history state, focus restoration, preferences and scene lifetime. A generation token prevents stale initialization from taking ownership. A lost GPU context clears its handle and quality so an explicit retry creates a new scene. |
| `transitions.ts`                                     | Interruptible forward and return transitions. Live 3D uses Web Animations FLIP immediately; lightweight views use native View Transitions when available, with a 220 ms watchdog and the same fallback.                                  |
| `scene/world.ts`                                     | Architecture, vegetation and water assembly; optional baked-model replacement; mutable picking list and content-exhibit bindings.                                                                                                        |
| `architecture.ts`, `construction.ts`, `materials.ts` | Original terraces, buildings, furnishings and timeline; geometry construction and material batching; local surface maps.                                                                                                                 |
| `landscape.ts`, `water.ts`                           | Instanced Mediterranean planting, tree geometry and animated water. Botanical geometry is grouped into seven draw batches.                                                                                                               |
| `baked.ts`, `canopy.ts`                              | Abortable GLB/Draco loading and resource ownership; a runtime canopy refinement that opens the gallery's right pier while preserving its lightmap UVs, then adds an underside and a thin support.                                        |
| `camera.ts`                                          | Stable Home framing and retargetable room journeys. Destination, selected-project and milestone poses fit the available viewport and account for the overlapping desktop panel.                                                        |
| `exhibits.ts`                                        | The selected project's actual display texture, the original portrait inside the studio, and the career milestone marker. Selection state is supplied by the HTML controller.                                                           |
| `island-spatial.css`                                 | Persistent world and native-scrolling reading panels; stacked room and panel layout on narrow screens.                                                                                                                                    |
| `rendering.ts`                                       | Color compositing, depth and desktop contact occlusion.                                                                                                                                                                                  |
| `scene/index.ts`, `resources.ts`                     | Renderer scheduling, visibility/intersection observers, picking, reflection capture and disposal.                                                                                                                                        |

## Interaction and presentation

Ordinary links remain the navigation authority. Direct destination/project URLs, refresh, browser Back/Forward, keyboard navigation and touch use the same route state. Closing a project restores its trigger; closing a destination restores the navigation trigger.

Destination navigation keeps one scene alive and moves its camera into the corresponding room. Desktop content occupies an ivory reading panel overlapping the right side of the world. At widths up to 900 px, the room uses a `minmax(190px, 32svh)` stage above the panel; short landscape screens use a side-by-side arrangement. The panel scrolls natively, and Home/Close controls remain sticky. Without JavaScript, sections stay in ordinary document flow.

Section entrances, card feedback, labels and the header contact action respect both the visible motion control and the system reduced-motion preference. The live WebGL canvas never waits for a native browser snapshot before the HTML route commits. Lightweight-view snapshots fall back if their update callback has not run within 220 ms. Pending transitions are cancelled or retargeted instead of being queued.

About displays the unchanged 640 × 640 portrait in a proportional crop. Shared section styles organize the biography, AI/skills content, date-led experience list and contact action without replacing their source content. The gallery retains canonical screenshots, demo/source links and truthful private-work labels.

## Content inside the world

Opening a project updates the gallery's central physical display and moves the camera closer. A sector filter previews its first matching project without entering the close-up pose; clearing the filter or leaving Work restores the original display. The HTML panel remains the source of project descriptions and actions. Its preview is compact in live 3D and retains its full presentation in the lightweight view.

The controller accepts known project IDs and same-origin `/projects/` screenshots. For entries represented by diagrams, it snapshots the actual SVG with computed paint and text styles and its existing background. The snapshot removes scripting, external-capable elements and animation, and keeps only local fragment references. The bounded cache contains at most the known project set. `exhibits.ts` reuses one canvas texture, rejects stale asynchronous image completions, and rebinds the selection when the baked model replaces the procedural gallery. An image failure leaves the original display and HTML content usable.

Entering About lazily places the unchanged `/khalil.jpg` in a frame inside the studio. In Experience, pointer hover or keyboard focus previews a blue marker at the corresponding physical date. Activating the date toggles a selected milestone and its camera focus; `aria-pressed` mirrors that state. Leaving Experience clears it. These controls are disabled when no live 3D scene is available, while the dates and career content remain readable.

## Scene loading and lifetime

The procedural architecture is immediately usable while the baked architecture loads. The replacement contains the static buildings and terrain; vegetation and water remain live objects. Once the replacement arrives, the world refines the gallery canopy and rebuilds picking from the new meshes. The temporary architecture has its own `SceneResources` scope, released after the replacement's first rendered frame so initial asynchronous shader compilation can finish safely.

`baked.ts` aborts fetches and decoder requests, terminates Draco workers, and owns partial parser allocations as they resolve. Geometry, materials, textures and decoded ImageBitmaps are disposed even when parsing finishes after cancellation. Asset failure leaves the procedural world usable.

Rendering pauses when the document is hidden or the scene is offscreen. Scrolling a reading panel does not move the persistent room offscreen. Motion off makes rendering demand-driven; navigation and content changes still request a paint. Picking includes architecture and terrain occluders and excludes the large decorative foliage instance sets. A single explicit navigation paint handles a canvas that has just moved onscreen before its intersection observer updates. Exhibit image requests, textures, materials and decorative geometry belong to the scene's resource scope and are released with it.

## Color and reflections

The renderer classifies late-loaded objects on every frame:

| Layers | Content                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| 0 / 1  | Tone-mapped opaque / transparent physical materials                                                                   |
| 2 / 3  | Opaque / transparent materials with `toneMapped=false`, including literal screens, signs and baked diffuse appearance |

The high-quality path applies contact occlusion and tone mapping to physical color, then composites literal color with depth preserved. Native multisampling needs a geometry depth prepass: copying one depth sample into an antialiased framebuffer had rejected half the samples on angled screens. Non-antialiased contexts use the cheaper depth copy. Glass and transparent text render together in depth order. The low-quality path renders all four layers directly.

High quality also captures one 128-pixel cube reflection probe from the modeled world after the baked architecture arrives. Polished floors, glass and metal use that environment; the low-quality path retains the existing environment. This is a local reflection approximation, not continuous global illumination.

## Assets and verification

The world uses original geometry, verified project screenshots, licensed self-hosted fonts, two generated mineral maps and an offline Cycles lighting atlas. The supplied reference is not shipped as a background. See [asset provenance](ASSET_PROVENANCE.md) and [bake instructions](BAKE.md).

Regenerate actual-scene posters and comparison captures against a running local build:

```sh
node scripts/capture-island.mjs http://127.0.0.1:4196
node scripts/capture-spatial.mjs http://127.0.0.1:4196
```

These authoring commands use existing Playwright plus Python/Pillow, wait for the baked architecture, capture the WebGL framebuffer, and encode WebP fallbacks. Run them sequentially against a stable build, without another software-rendered suite competing for the GPU process. Their metrics identify SwiftShader explicitly. CPU submission time and submitted-triangle counts are not hardware GPU frame-rate measurements.

The spatial command captures each settled room at desktop and mobile sizes, waiting for the studio portrait in About. It writes room posters under `public/island/rooms/`, comparison images under `docs/island/qa/`, and `spatial-capture.json`. Add verified poster paths to `destinationPosters` in `src/lib/island/posters.ts` after reviewing those outputs, then rebuild. Missing room entries deliberately fall back to the same-scene Home poster; the capture command does not populate that mapping or establish visual acceptance by itself.

Repository checks are `npm run astro -- check`, `npm run build` and `npm run test:e2e`. No separate lint command is configured. The immutable preservation fixture must not be regenerated to silence failures. The color-pipeline probe checks literal pixel consistency; real WebGL lifecycle tests use Chromium SwiftShader, while the ordinary suite covers Chromium and WebKit HTML interactions. Current integrated and visual acceptance status belongs in `design-qa.md` and the latest test evidence, not in this architecture description.
