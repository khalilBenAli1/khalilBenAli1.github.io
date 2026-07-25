# motion/ — Wave 1A primitives

Everything here is initialised by `src/scripts/site.ts`. Wave 2 should not need
to write animation code — tag markup with the attributes below and add the
classes. Import GSAP only from `./gsap` (it registers plugins + sets
`gsap.defaults({ ease: "expo.out", duration: 0.9 })`).

## Reveals — `reveal.ts`

| Attribute | Use on | Motion |
| --- | --- | --- |
| `data-reveal="chars"` | display headings (h1/h2) | chars rise 110% inside line masks, stagger 0.012 |
| `data-reveal="lines"` | paragraphs, lead copy, list rows | whole lines rise 105% inside masks, stagger 0.05 |
| `data-reveal="fade"` | cards, blocks, media | y 24 → 0 + opacity, single element |
| `data-reveal-group` | container of several `fade` children | one trigger, children stagger 0.09 |

Rules: trigger is `top 82%`, `once: true`. Everything waits for the preloader
(`kb:ready`), so hero copy prints in after the curtain — but **only the splits**
additionally wait for font metrics, and that wait is capped at 300ms
(`Promise.race`). Blocking the whole engine on `document.fonts.ready` left the
hero primed at `opacity: 0.001` with no curtain over it on repeat visits.
`class="reveal"` (legacy) is still picked up as `fade`; migrate it to
`data-reveal` and stop using the class (leave the CSS). Reduced motion: inline
opacity/transform cleared instantly, no splitting, nothing ever hidden.

Keyboard focus can land on an element whose reveal has not triggered (tab order
ignores the viewport). `focusin` completes that element's tween instantly —
walking *all* `[data-reveal]` ancestors, not just the nearest — and
`motion/scroll.ts` brings it into view. Any new reveal must therefore register
its tween via `remember()`.

`data-reveal="lines"` **must not wrap a heading.** SplitText rebuilds the subtree
as block-level line boxes: the `h3`/`h2` drops out of the accessible tree and its
inline children glue into one label string. Split prose only.

Two invariants you must not break if you touch this file:

1. **Always `fromTo`, never `from`.** `gsap.from()` records the element's
   current value as the *end* value, and a `ScrollTrigger.refresh()` can
   re-record it while the from-state is applied — the element then animates
   `0.001 → 0.001` and never appears. Staggered `from` tweens hit this every
   time.
2. **Priming lives in CSS, not JS.** `html.kb-js [data-reveal], html.kb-js
   .reveal` is hidden from the first paint; the inline `<head>` script in
   `Base.astro` adds `kb-js` (never under reduced motion) and removes it after
   5s as a dead-bundle safety net. Drop the class and content pops out visible
   before the engine builds; drop the timer and a broken bundle blanks the page.
   `reveal.ts` removes `kb-js` itself the moment the from-states are inline —
   that must stay *before* any reveal can complete (see 3).
3. **Reveals `clearProps: "opacity"` on completion.** GSAP's leftover inline
   `opacity: 1` outranks every stylesheet rule, so any hover state that
   modulates opacity — `.dim-siblings` above all — silently does nothing on a
   revealed element. Releasing opacity fixes that; the identity transform is
   deliberately left in place so a `[data-parallax]` scrub on the same element
   isn't fighting a one-frame reset.

## Scroll — `scroll.ts`

`initScroll()` builds Lenis (`lerp 0.1`, `autoRaf: false`) on the GSAP ticker.
Not constructed at all under reduced motion — native scroll, everything else
still works.

- `lockScroll(true|false)` — call on menu/modal open/close (stops Lenis **and**
  sets `overflow: hidden`). Already wired to the nav burger in `site.ts`.
- `refreshScroll()` — after any layout-changing class toggle or late media.
- `getLenis()` — escape hatch (e.g. back-to-top).
- In-page `href="#…"` links are intercepted and routed through Lenis. **Pass no
  offset**: Lenis reads `scroll-padding-top` off the scroll root itself, so
  `base.css` is the single source of nav clearance for Lenis jumps, native deep
  links and `scrollIntoView` alike. An offset here stacks on top of it and
  overshoots. `#top` scrolls to 0. Nothing to do per link.
- `focusin` re-routes through Lenis when the focused element is out of view.
  Without it the browser scrolls the real position while Lenis keeps writing the
  old one back, and the page snaps away from whatever just took focus.
- Inner scroll areas need `data-lenis-prevent` (nothing needs it today; check
  the mobile nav overlay if its content ever exceeds the viewport).

## Scroll-linked — `parallax.ts`

Desktop only (`min-width: 821px`), reverted automatically below that.

- `.hero__inner` drifts `yPercent -6` + `opacity .25`, scrubbed over the first 90vh.
- `data-parallax` → ±6% of own height across the viewport.
  `data-parallax="10"` overrides the amount. Tag diagram holders / ghost type.

## Preloader — `preloader.ts`

DOM lives in `Base.astro` (`.preloader`, `[data-preloader-count]`). Dismissed on
`Promise.race([window load, 1000ms])`, exits with `clip-path: inset(0 0 100% 0)`.
Once per browser session (`sessionStorage["kb-loaded"]`); the skip is decided by
an inline `<head>` script that stamps `html.kb-preload-skip` before paint.
Skipped under reduced motion.

- `await ready` (exported promise) or listen for `"kb:ready"` on `document` to
  sequence anything after the curtain. Both fire immediately when skipped.

## Cursor — `cursor.ts`

6px dot (`quickTo .15`) + 34px lagging ring (`quickTo .5`). Augments the native
cursor — never `cursor: none`. Fine pointers only, hidden on
`(pointer: coarse)` and under reduced motion.

- Ring scales 1.6 + turns violet over `a[href]`, `button`, `[role="button"]`,
  `[data-cursor]`.
- `data-cursor="view"` also mirrors the value onto the cursor root as
  `data-cursor` — hook for a contextual label later.

## Hover — `hover.ts`

- `data-magnetic` — drifts ≤10px toward the pointer, returns with
  `elastic.out(1, 0.3)`. **Ration it: 2–4 elements site-wide.**
- `data-magnetic-label` — optional inner element; counter-moves at 0.5x so the
  label parallaxes inside its own button.
- `data-tilt` — 3D tilt ≤6°, `transformPerspective: 900` (hero photo card).

Note: `.btn` no longer has a `translateY` hover — GSAP owns `x`/`y` on magnetic
elements and the two would fight. Use `box-shadow` for lift.

## Marquee — `marquee.ts`

Takes over `.marquee__track` (kills the CSS keyframes inline; the CSS stays as
the no-JS / reduced-motion fallback). `xPercent -50` loop, `timeScale`
1 → 2.2 with scroll speed, `skewX` clamped ±12° from scroll velocity with a
decay lerp. Pauses when the strip is off-screen. Slower loop on ≤51.25rem.
Hover (fine pointers) ramps `timeScale` to 0 over 0.4s; the ticker stops writing
`timeScale` while that ramp owns it, or it would erase the tween every frame.

## Local time — `time.ts`

`<span data-local-time>--:--</span>` → Europe/Rome `HH:MM`, updated every 10s.
Render the `--:--` placeholder server-side (no CLS). `tabular-nums` is applied
by base.css.

## CSS utilities (base.css)

| Class | Notes |
| --- | --- |
| `.card-v3` | solid surface gradient + `--bevel-top` + `--shadow-dir`, **no blur**. `.glass-card` is now an alias of it — migrate names, don't reintroduce `backdrop-filter`. |
| `.dim-siblings` | on a card **container**: hovering one card drops the others to `opacity .55`. Works on `.card-v3` and `.glass-card` children. Verified against revealed cards — don't reintroduce an inline opacity on them. |
| `.link-roll` | duplicate-label slide. Markup: `a.link-roll > span.link-roll__mask > span.link-roll__inner > span + span[aria-hidden]`. The mask is inner so the focus ring isn't clipped. |
| `.btn` | radius `--r-btn`; `::after` sweeps `scaleY(0→1)` from the bottom at `z-index:-1`, so **no markup change is needed**. `--primary` = solid violet `#7c5cff` on `#0b0714` + violet glow (no gradient). `--ghost` = border + bevel on hover. |
| `.accent-serif` | Instrument Serif italic 400. One accented word per heading — Wave 2's `accent()` helper emits `<em class="accent-serif">`. |
| `.tnum` | `tabular-nums`; auto-applied to `[data-local-time]` and `[data-section-index]`. |
| `.grain` | fixed noise layer in `Base.astro`. Nothing to do. |

New tokens: `--ease-expo`, `--ease-quart`, `--dur-hover`, `--dur-reveal`,
`--faint`, `--r-pill/-card/-btn/-chip`, `--bevel-top`, `--shadow-dir`,
`--card-surface`, `--grain-opacity`, `--font-accent`, `--z-grain/-preloader/-cursor`.

## Left for Wave 2 (deliberately not done here)

- `--h1` is still `clamp(2.9rem, 7vw, 5.2rem)`. D2 wants
  `clamp(3rem, 8vw, 6.5rem)` — bump it **together with**
  `.hero__title { font-weight: 500 }` in `Hero.astro`, never alone, or you get
  bold-at-huge. `.section-title` is already weight 500 + `text-wrap: balance`.
- `src/lib/accent.ts` + the `*word*` markers in `i18n.ts` (all three locales).
- Swapping `class="reveal"` → `data-reveal` and tagging `data-parallax`,
  `data-local-time`, `data-magnetic-label`, `.link-roll` markup.
