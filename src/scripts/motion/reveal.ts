/**
 * Reveal engine. Replaces the old IntersectionObserver + CSS `.reveal` system.
 *
 * Three vocabularies, chosen per element with a data attribute:
 *   data-reveal="chars"  display headings — chars rise inside line masks
 *   data-reveal="lines"  paragraphs / lead copy — whole lines rise inside masks
 *   data-reveal="fade"   cards and blocks — low-amplitude y + opacity
 *   data-reveal-group    on a container: its "fade" children stagger together
 *
 * The mask is the whole point: letterforms are cropped by an invisible edge,
 * which a plain fade can never look like. Amplitudes stay LOW on purpose.
 *
 * Legacy `class="reveal"` elements are picked up as "fade" so the site keeps
 * animating while Wave 2 migrates the markup.
 *
 * Priming: `html.kb-js [data-reveal], html.kb-js .reveal` is hidden by CSS from
 * the very first paint. Without it, everything paints at full opacity in the
 * window between the curtain lifting and this module building, then snaps to
 * hidden — a visible pop-out. The class is added, and removed again after 5s as
 * a dead-bundle safety net, by the inline <head> script in Base.astro, so a
 * broken bundle degrades to "content appears late", never "content never
 * appears". It is never added under reduced motion: those users must not have
 * content withheld from them even briefly.
 */
import { gsap, ScrollTrigger, SplitText, STAGGER } from "./gsap";
import { REVEAL_START } from "./env";
import { ready } from "./preloader";

const SEL_CHARS = '[data-reveal="chars"]';
const SEL_LINES = '[data-reveal="lines"]';
const SEL_FADE = '[data-reveal="fade"], .reveal:not([data-reveal])';
const SEL_TEXT = `${SEL_CHARS}, ${SEL_LINES}`;
const SEL_ALL = "[data-reveal], .reveal";

/**
 * Released on completion so CSS owns opacity again. Without this, the inline
 * `opacity: 1` GSAP leaves behind outranks every stylesheet rule and hover
 * states that modulate opacity — `.dim-siblings` above all — silently do
 * nothing on any element that has been revealed. Only opacity is cleared;
 * the identity transform is left alone so a [data-parallax] scrub on the same
 * element isn't fighting a one-frame reset.
 */
const OPACITY = "opacity";

/** Font metrics matter to SplitText, but not enough to hold the page hostage. */
const FONT_WAIT_MS = 300;

/**
 * Reveal target → the tween that will show it. Keyboard focus can land on an
 * element whose reveal has not been triggered yet (the tab order does not care
 * about the viewport), and an invisible focused control is a dead end. See
 * initFocusRescue().
 */
const tweens = new WeakMap<Element, gsap.core.Tween>();

function remember(targets: Element[], tween: gsap.core.Tween): void {
  for (const el of targets) tweens.set(el, tween);
}

function trigger(el: Element): ScrollTrigger.Vars {
  return { trigger: el, start: REVEAL_START, once: true };
}

/**
 * SplitText wraps the text of nested inline elements, and an `<em>` that has had
 * all of its text lifted into line boxes is left behind as an empty node. Those
 * strays still carry `.accent-serif`, so they inherit the serif face and a
 * font-size bump — enough to open a visible gap mid-sentence.
 */
function dropEmptyAccents(el: HTMLElement): void {
  el.querySelectorAll(".accent-serif:empty").forEach((node) => node.remove());
}

function buildText(): SplitText[] {
  const splits: SplitText[] = [];

  // chars + lines (not chars alone): masking lines instead of every character
  // is far fewer DOM nodes for the same effect.
  document.querySelectorAll<HTMLElement>(SEL_CHARS).forEach((el) => {
    gsap.set(el, { opacity: 1 }); // container is primed by CSS; the chars move
    splits.push(
      SplitText.create(el, {
        type: "chars,lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) => {
          dropEmptyAccents(el);
          const tween = gsap.fromTo(
            self.chars,
            { yPercent: 110, opacity: 0.001 },
            {
              yPercent: 0,
              opacity: 1,
              stagger: STAGGER.chars,
              scrollTrigger: trigger(el),
              clearProps: OPACITY,
            },
          );
          remember([el], tween);
          return tween;
        },
      }),
    );
  });

  document.querySelectorAll<HTMLElement>(SEL_LINES).forEach((el) => {
    gsap.set(el, { opacity: 1 });
    splits.push(
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) => {
          dropEmptyAccents(el);
          const tween = gsap.fromTo(
            self.lines,
            { yPercent: 105, opacity: 0.001 },
            {
              yPercent: 0,
              opacity: 1,
              stagger: STAGGER.lines,
              scrollTrigger: trigger(el),
              clearProps: OPACITY,
            },
          );
          remember([el], tween);
          return tween;
        },
      }),
    );
  });

  return splits;
}

function buildFades(): void {
  const grouped = new WeakSet<Element>();

  document
    .querySelectorAll<HTMLElement>("[data-reveal-group]")
    .forEach((group) => {
      // Only this group's own children — nested groups keep their own stagger.
      const items = Array.from(
        group.querySelectorAll<HTMLElement>(SEL_FADE),
      ).filter((item) => item.closest("[data-reveal-group]") === group);
      if (!items.length) return;
      items.forEach((item) => grouped.add(item));
      remember(items, fade(items, trigger(group), STAGGER.cards));
    });

  document.querySelectorAll<HTMLElement>(SEL_FADE).forEach((el) => {
    if (grouped.has(el)) return;
    remember([el], fade(el, trigger(el)));
  });
}

/**
 * Always fromTo, never from.
 *
 * `gsap.from()` records the element's *current* value as the end value. A
 * ScrollTrigger.refresh() (which we call on every font load and resize) can
 * re-record it while the from-state is already applied, which permanently
 * pins the end value to the hidden state — the element animates 0.001 -> 0.001
 * and never appears. Staggered from-tweens hit this reliably. Explicit end
 * values make it impossible.
 */
function fade(
  targets: gsap.TweenTarget,
  scrollTrigger: ScrollTrigger.Vars,
  stagger = 0,
): gsap.core.Tween {
  return gsap.fromTo(
    targets,
    { y: 24, opacity: 0.001 },
    { y: 0, opacity: 1, stagger, scrollTrigger, clearProps: OPACITY },
  );
}

/**
 * Reduced-motion branch: everything sits at its final state, instantly.
 *
 * clearProps rather than `opacity: 1`, because a leftover inline opacity is
 * exactly what breaks `.dim-siblings` (see OPACITY above) — under reduced
 * motion these elements were never hidden in the first place, so there is
 * nothing to override and CSS should own them outright.
 */
function setFinalStates(): void {
  const els = document.querySelectorAll<HTMLElement>(SEL_ALL);
  if (els.length) {
    gsap.set(els, { clearProps: "opacity,transform" });
  }
}

/**
 * Tab order ignores the viewport: focus can land inside a card that has not
 * scrolled into view yet, and its reveal tween is still parked at the hidden
 * from-state. Completing the tween is enough — the scroll itself is handled in
 * motion/scroll.ts. Nested targets both get completed (an entry that fades
 * while the note inside it splits), hence the walk instead of one closest().
 */
function initFocusRescue(): void {
  document.addEventListener("focusin", (event) => {
    const start = event.target;
    if (!(start instanceof Element)) return;
    let node = start.closest(SEL_ALL);
    while (node) {
      tweens.get(node)?.progress(1);
      node = node.parentElement?.closest(SEL_ALL) ?? null;
    }
  });
}

/** document.fonts.ready, capped — a slow webfont must not hold back the page. */
function fontsSettled(): Promise<unknown> {
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

export async function initReveal(): Promise<void> {
  // The curtain, not fonts, is what the choreography waits on. On a repeat visit
  // there is no curtain and this resolves in the same tick.
  await ready;

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", () => {
    setFinalStates();
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    /*
      Splitting against fallback font metrics produces broken line boxes, so the
      splits wait for font metrics — but ONLY the splits. Waiting on
      document.fonts.ready before building anything left the whole hero primed at
      opacity 0.001 with no curtain over it on repeat visits: a blank hero for as
      long as the font layer took. Fades build now; the split targets are held
      hidden by an inline from-state (below) so the CSS priming can still be
      dropped on this frame.
    */
    gsap.set(document.querySelectorAll<HTMLElement>(SEL_TEXT), {
      opacity: 0.001,
    });
    buildFades();

    const splits: SplitText[] = [];
    let live = true;
    void fontsSettled().then(() => {
      // The query can flip to reduce while the fonts are still settling.
      if (!live) return;
      splits.push(...buildText());
      ScrollTrigger.refresh();
    });

    return () => {
      live = false;
      splits.forEach((split) => split.revert());
    };
  });

  initFocusRescue();

  // Drop the CSS priming now that every target carries an inline from-state.
  // This MUST happen before any reveal completes: completion clears the inline
  // opacity, and if `kb-js` were still set the element would snap back to
  // hidden. (The 5s timer in Base.astro is only the dead-bundle net.)
  document.documentElement.classList.remove("kb-js");

  ScrollTrigger.refresh();
}
