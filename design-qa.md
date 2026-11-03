# Reference implementation visual QA

Source: `/Users/khalilbenali/.codex/generated_images/01a19f14-aef5-7631-a46a-2a3c7576fec3/exec-dc979881-f5eb-44a1-908e-5139d146973d.png`.
Desktop evidence: `docs/island/qa/desktop-01.jpg` through `desktop-06.jpg`; current full-page capture in `desktop-current.png`. Mobile evidence: `mobile-current.png`.
Viewport: desktop1584×992 CSS px, DPR1; mobile390×844 CSS px, DPR1. Original reference1584×992. Desktop captures use equal pixel dimensions and were opened together with the original for comparisons. State: home, explicit3D. Captures marked current are reproducible software-rendered snapshots and may precede the newest geometric iteration.

## Comparison history

1. Initial detailed world:56/100. Layout recognizable; thin fallback font, gray poster rectangle, underscaled world, pale striped materials and inadequate canopy.
2. Generated travertine texture, richer plants, corrected background and larger world:68/100. Rock facets, insufficient depth and typography remained.
3. Contact occlusion and actual public font delivery corrected. Internal score74; contact elevation, timeline overlap and studio depth remained.
4. Adjusted contact terrace, warm material tint and interior detail. Internal score80 was subsequently judged too optimistic.
5. Independent review of `desktop-05.jpg`:68/100, revise. The scene still read as a stylized model. Priority findings: physical light/surface realism, studio elevation and height, repeated rounded rock ring, overly wide canopy, timeline/plant intersections.
6. `desktop-06.jpg`: studio raised and shortened, tree narrowed/twisted, rock ring replaced largely by continuous fractured faces, timeline text brought forward and contact planting cleared. Internal74/100; lighting and staircase alignment remained. A diagonal stair refinement followed. A portable Blender proof is being tested before further acceptance.

## Required fidelity surfaces

- Fonts/typography: licensed Inter900 now loads correctly from public assets; heavier second/third headline lines better match the source. Companion DM Sans remains readable. French/Italian and mobile wrapping retain their own fit.
- Spacing/layout: header, left editorial column, dominant world and thin footer now follow the reference. Studio/camera/stair proportions remain under refinement.
- Colors/tokens: ivory, black, electric blue and concentrated yellow are established. Runtime mineral light is still less natural than the reference.
- Image quality/assets: real project screenshots and original interactive geometry are used. Source image is not shipped as a background. Surface depth/reflection and geological realism remain acceptance blockers.
- Copy/content: fictional reference screens and career dates are deliberately replaced with verified existing project/career content. All original translations/downloads remain protected by immutable tests.

Focused review covered architecture, vegetation, stone, timeline lettering and furniture at full screenshot resolution. No page errors occurred in capture tooling. Functional tests are separate: preservation/navigation/gallery cases passed in Chromium and WebKit; all three real WebGL lifecycle cases passed in Chromium SwiftShader. Software timing is recorded explicitly in runtime.json and is not hardware FPS evidence.

Next: integrate and compare the physical-lighting proof, regenerate final same-scene posters, capture stable desktop/mobile output, repeat independent visual review, and run final checks before publishing.

final result: blocked
