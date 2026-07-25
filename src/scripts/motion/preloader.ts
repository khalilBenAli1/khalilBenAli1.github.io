/**
 * Preloader curtain.
 *
 * Rules that keep this from being the most damaging thing on the site:
 *  - never gated on a timer alone — Promise.race([window load, 1000ms]);
 *  - real content stays in the DOM, painted, underneath the curtain, so the
 *    hero is still the LCP element and the curtain never inflates it;
 *  - once per browser session (sessionStorage "kb-loaded"); the skip decision
 *    is made by an inline <head> script that stamps html.kb-preload-skip
 *    BEFORE first paint, so repeat visits never flash a curtain;
 *  - skipped entirely under prefers-reduced-motion.
 *
 * Everything that wants to start after the curtain awaits `ready` (or listens
 * for the "kb:ready" event on document). Both fire immediately when skipped.
 */
import { gsap } from "./gsap";
import { reduced } from "./env";

const SESSION_KEY = "kb-loaded";
/** Hard cap before dismissal starts (V3 invariant 6: preloader <= 1s). */
const MAX_WAIT_MS = 1000;

let settle!: () => void;

/** Resolves when the curtain is gone — immediately if it never showed. */
export const ready: Promise<void> = new Promise<void>((resolve) => {
  settle = resolve;
});

let finished = false;

function finish(): void {
  if (finished) return;
  finished = true;
  settle();
  document.dispatchEvent(new CustomEvent("kb:ready"));
}

function windowLoaded(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

export function initPreloader(): void {
  const el = document.querySelector<HTMLElement>("[data-preloader]");
  const skipped =
    document.documentElement.classList.contains("kb-preload-skip");

  if (!el || skipped || reduced) {
    el?.remove();
    finish();
    return;
  }

  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // private mode / storage disabled — the curtain just shows every visit
  }

  const counter = el.querySelector<HTMLElement>("[data-preloader-count]");
  const n = { value: 0 };
  const paint = (): void => {
    if (counter) {
      counter.textContent = String(Math.round(n.value)).padStart(2, "0");
    }
  };
  paint();

  // steps() gives the deliberate mechanical feel; it stops short of 100 so the
  // exit can land the last digits instead of idling on a finished counter.
  const count = gsap.to(n, {
    value: 96,
    duration: MAX_WAIT_MS / 1000,
    ease: "steps(14)",
    onUpdate: paint,
  });

  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, MAX_WAIT_MS);
  });

  void Promise.race([windowLoaded(), timeout]).then(() => {
    count.kill();
    gsap
      .timeline({
        onComplete: () => {
          el.remove();
          finish();
        },
      })
      .to(n, { value: 100, duration: 0.2, ease: "steps(4)", onUpdate: paint })
      .to(el, {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.8,
        ease: "expo.inOut",
      });
  });
}
