# Architectural portfolio visual review

The desktop comparison uses a 1584 × 992 production capture, matching the supplied reference. The mobile view uses 390 × 844. All ten comparison views came from Chromium on an Apple M1. The room captures wait for the camera to settle and for the studio portrait to load. The capture logs record the renderer, camera measurements and browser errors.

- [Desktop Home](docs/island/qa/desktop-current.png)
- [Mobile Home](docs/island/qa/mobile-current.png)
- [Desktop gallery](docs/island/qa/spatial-work-desktop.png)
- [Mobile studio](docs/island/qa/spatial-about-mobile.png)
- [Desktop timeline](docs/island/qa/spatial-experience-desktop.png)
- [Mobile contact pavilion](docs/island/qa/spatial-contact-mobile.png)
- [Measurements for all eight room views](docs/island/qa/spatial-capture.json)

## Findings

The independent comparison rated Home 90/100 and the eight desktop and mobile room layouts 92/100. These are visual judgments. The gallery floor now reflects the blue seat, chrome stool and screens in their actual positions. The pendant and warm back wall make the furnished studio legible through its windows. Each destination keeps its own part of the island visible beside or above the reading panel. After the last planting adjustment, the reviewer confirmed that “2019–2022”, “Tynass IT” and “Developer” are visible on desktop and mobile. A small dark patch remains on the tread beneath the first light.

The implemented gallery shows more roof and less shaded soffit than the reference. Rock fractures and olive branches have more regular shapes. Water is brighter and its ripples are more uniform. Real portfolio screenshots and career dates replace the fictional examples in the reference.

## Iterations and verification

The first review scored the composition 56/100. Correcting the typeface, terrace levels, gallery opening, geology, stone texture and sunlight brought the model closer. The 86/100 review isolated the two final material issues in the courtyard and studio. The final review used the production render with the local reflection and interior light applied.

The runtime tests exercise room changes, project displays, milestone selection, history, keyboard focus, reduced motion, WebGL failure, offscreen pausing and resource disposal. Software-rendered test timings are recorded separately from the Apple GPU captures. See [integration checks](docs/island/qa/integration-run.json), [Home capture measurements](docs/island/qa/capture-metrics.json) and [poster provenance](docs/island/SCENE_POSTERS.json).
