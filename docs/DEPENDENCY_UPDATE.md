# Compatible dependency maintenance — 3 November 2026

## Bounded plan, written before dependency changes

Scope: only package.json, package-lock.json and this document. Preserve all application source, UI assets, routes, motion, gallery content, CI workflow and the Node 22.23.1 baseline. Do not run the legacy verify.mjs, whose hardcoded paths are stale.

This is an upstream dependency refresh. It does not introduce a new application abstraction or perform a source refactor.

1. Lock the current behavior with temporary QA under /private/tmp: all three locale home and resume routes at 1440px and 390px; six gallery cards and their links/images; desktop/mobile navigation and Escape; loaded-font layout viewport measurements; actual home/gallery/resume screenshots.
2. Update only the directly pinned Astro version from 7.1.3 to 7.4.1. Align the manifest's Node floor with Astro's supported >=22.22.0 while keeping .nvmrc at 22.23.1 and npm pinned to 10.9.8.
3. Refresh fast-uri within its existing transitive semver range. No force, overrides, downgrade or added direct dependency. Confirm every unrelated direct dependency specification and installed version remains unchanged.
4. Prove a clean standard-peer npm ci, zero audit findings, Astro check and production build. Repeat the baseline semantic/screenshot QA and add WebKit sanity checks. Store temporary tests, captures and audit JSON only under /private/tmp.
5. Review the three-file diff, commit/push and open a feature PR. Root reviews the CI and application output before merging.

## Assessment and validation

The verified dependency checkpoint is recorded below. A separately authorized mobile-menu correction follows it in an independent commit.

### Dependency checkpoint results

- Kept Node 22.23.1 and npm 10.9.8. Added packageManager=npm@10.9.8 and aligned the manifest Node floor to>=22.22.0, the actual Astro 7.4.1 requirement. The existing .nvmrc and CI workflow are unchanged.
- Installed exact Astro 7.4.1, then ran a normal semver-respecting fast-uri update. No force, overrides, downgrades or new direct dependencies were used.
- All 13 unrelated direct dependency specifications and their resolved installed versions are unchanged, including GSAP, Lenis, Three and the existing fonts/check/browser tooling.
- Clean npm ci with legacy-peer-deps=false succeeded. Full npm audit reports 0 vulnerabilities. Astro check: 51 files, 0 errors, 0 warnings, 0 hints. The static production build generated 7 routes successfully. It reports a retained lazy Three.js chunk above the 500kB advisory threshold; no application chunking/source was changed in this task.

| Affected dependency | Before | After |
| --- | --- | --- |
| Astro | 7.1.3 | 7.4.1 |
| devalue | 5.8.2 | 6.0.3 |
| fast-uri | 3.1.4 | 3.1.9 |
| js-yaml | 4.3.0 | Removed from graph |
| nanoid | 3.3.16 | 3.3.20 |
| PostCSS | 8.5.22 | 8.5.32 |
| Sharp | 0.35.3 | 0.35.5 |
| smol-toml | 1.7.0 | 1.9.1 |
| source-map-js | 1.2.1 | 1.2.2 |
| SVGO | 4.0.2 | 4.1.0 |
| Vite | 8.1.5 | 8.3.5 |
| Zod | 4.4.3 | 4.6.7 |

The lockfile contains the complete upstream transitive changes, including platform-specific optional binaries. All direct dependencies outside Astro retain their previous versions.

### Behavior and visual baseline

Temporary Playwright 1.64 QA lives in /private/tmp/portfolio-toolchain-qa, outside the repository; it uses an existing authorized browser tool installation without adding a project dependency. Both Chromium and WebKit checked 12 route/viewport cases each: EN/FR/IT home and resume pages at 1440px and 390px, local font/image loading, six gallery cards and their links, headings/titles/language, layout viewport bounds, and navigation/Escape behavior. The after-update semantic records exactly match each engine's before-update records. No asset or JavaScript runtime errors were found.

Thirty-six before/after screenshots were captured in that temporary directory. 34 pairs are byte-identical. The two remaining WebKit mobile hero captures differ only in the transient menu-button interaction styling; representative desktop/mobile, localized gallery and resume captures were opened and inspected. The application source and asset files are unchanged in this dependency checkpoint.

Baseline QA also reproduced an existing mobile pointer-navigation defect before dependency changes: the filtered header contains a fixed overlay only 67px high, placing the Work link at y=-167.7px on a 390px screen. The same geometry remains after the dependency update; Escape and direct keyboard activation work. This baseline defect is documented rather than hidden or counted as passing pointer navigation. The owner authorized a separate, narrow follow-up commit to move the overlay outside that containing block; it is not part of the dependency checkpoint.

### Static deployment assessment

The original audit reported 12 affected packages (1 critical, 10 high, 1 moderate). The published portfolio is static Astro output on GitHub Pages, with no runtime adapter. Inspection found no Astro image-optimization usage, JSX/MDX rendering, Astro View Transitions, request authorization middleware or public parser/validation endpoint. The critical [AVIF advisory](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) requires processing an untrusted image; other [JSX/MDX](https://github.com/withastro/astro/security/advisories/GHSA-98hj-9722-w3j8) and [transition](https://github.com/withastro/astro/security/advisories/GHSA-mpr7-6m5w-76rw) findings also have input/feature conditions not found here. fast-uri belongs to the development checking/language-server chain. The update removes known dependency findings and improves build/development tooling hygiene; it does not imply an accessibility or security certification.

Audit JSON, detailed dependency differences, logs, semantic snapshots and captures are in /private/tmp/portfolio-toolchain-qa. The original read-only assessment is /private/tmp/portfolio-dependency-assessment.json. These temporary artifacts are review evidence, not committed site assets.
