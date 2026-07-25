/**
 * Cursor augment: a 6px dot that tracks the pointer almost 1:1 and a 34px ring
 * that lags behind it.
 *
 * It AUGMENTS the native cursor — we never set `cursor: none`, because hiding
 * the real pointer is an accessibility regression for anyone who relies on it.
 * Gated on (hover: hover) and (pointer: fine) in both JS and CSS, and hidden
 * outright on coarse pointers and under reduced motion.
 *
 * quickTo recycles one tween per property. A gsap.to() per pointermove will
 * not hold 60fps.
 */
import { gsap } from "./gsap";
import { finePointer, reduced } from "./env";

const HOVER_SELECTOR = 'a[href], button, [role="button"], [data-cursor]';

export function initCursor(): void {
  if (reduced || !finePointer) return;

  const root = document.querySelector<HTMLElement>("[data-cursor-root]");
  const dot = root?.querySelector<HTMLElement>(".cursor__dot");
  const ring = root?.querySelector<HTMLElement>(".cursor__ring");
  if (!root || !dot || !ring) return;

  const dotX = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" });
  const ringX = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });

  let live = false;

  window.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
      if (!live) {
        live = true;
        root.classList.add("is-live");
      }
    },
    { passive: true },
  );

  document.addEventListener("pointerleave", () => {
    live = false;
    root.classList.remove("is-live");
  });

  // One delegated pair of listeners; state is declared on the DOM, not here.
  const setHover = (on: boolean, label?: string): void => {
    root.classList.toggle("is-hover", on);
    if (on && label) root.dataset.cursor = label;
    else delete root.dataset.cursor;
    gsap.to(ring, {
      scale: on ? 1.6 : 1,
      duration: 0.4,
      overwrite: "auto",
    });
  };

  document.addEventListener("pointerover", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest<HTMLElement>(HOVER_SELECTOR);
    if (hit) setHover(true, hit.dataset.cursor);
  });

  document.addEventListener("pointerout", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(HOVER_SELECTOR)) return;
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest(HOVER_SELECTOR)) return;
    setHover(false);
  });
}
