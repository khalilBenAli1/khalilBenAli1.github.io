# Destination flow audit

## Initial findings

Captured live in the in-app browser at 1584 × 992 after the user requested section polish and visible forward and return navigation.

1. Home → About (`about-before.jpg`): the square portrait rendered at 327 × 640, visibly distorted. Large blank bands and a weak “scroll” link reduced clarity. Preserve the image aspect ratio, compact the portrait/biography layout, and group AI and skills content.
2. About → Experience (`experience-before.jpg`): the career data was correct and readable, but wide, flat rows and distant dates weakened chronology. Use a clear date-led structure and comfortable line lengths.
3. Experience → Contact (`contact-before.jpg`): redundant title/Get in touch/Talk headings, a weak email underline, and small social actions diluted the invitation. Consolidate the hierarchy and strengthen email and social targets.
4. Contact → Work (`work-before.jpg`): filters, URLs and screenshots were correct, but the first images started around 720 px down the viewport. Reduce the header/intro/filter gap and improve exhibit framing.
5. Any section → Home: the hierarchy switched instantly between a large hero and a small sidebar. Add an interruptible transition in both directions, preserving URL, focus and history behavior, with an instant reduced-motion path.

These screenshots establish the original layout issues. The `*-after.jpg` captures record the subsequent section-polish iteration; they predate the integrated room experience below.

## Integrated room experience

The user's next observation was that 3D belonged only to the island, while the rest of the portfolio felt disconnected. The implementation now gives the world a role within the content:

- Work keeps the gallery visible beside the reading panel. Selecting a project changes the actual central display and brings the camera closer; sector filters preview a matching exhibit.
- About moves into the furnished studio and includes the original portrait in a physical frame as well as the proportional HTML portrait.
- Experience connects date hover, focus and selection to the physical timeline marker; selecting a date also focuses the camera.
- Contact moves into the yellow pavilion while keeping email and social actions in semantic HTML.
- Home and destination changes reuse the same scene with retargetable camera motion. Desktop panels overlap the world; narrow portrait layouts keep a room stage above a native-scrolling panel. Short landscape layouts keep both beside each other.

The sticky Home/Close controls, ordinary header links and view/motion controls remain available. This design uses browser-native panel scrolling, with no wheel interception or required 3D interaction. Reduced motion settles the view immediately. Lightweight and unavailable-WebGL states retain the content, and scene-only milestone controls are disabled.

## Verification status

The implementation details above were checked against the current source. `spatial-about-desktop.jpg` and `spatial-gallery-desktop.jpg` are intermediate live-browser evidence, not final acceptance captures.

Fresh settled desktop/mobile room captures, the corresponding lightweight poster mapping, and the integrated spatial/lifecycle test results remain required before integrated visual acceptance. `scripts/capture-spatial.mjs` produces those captures and poster assets, but does not itself approve their appearance. The final comparison and release decision belong in the root `design-qa.md` with the actual test evidence.

Automated verification must separately cover content preservation, direct URLs, history, keyboard/focus restoration, rapid camera retargeting, motion preferences, selected display/milestone reset, and resource disposal. A visually successful screenshot does not prove those behaviors, and passing them does not establish reference fidelity.
