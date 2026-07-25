/**
 * Capability gate for the background, kept free of any three.js import so that
 * site.ts can decide the tier BEFORE the dynamic import — a tier-0 device never
 * downloads, parses or compiles three at all, and never creates a GL context
 * (context creation alone is 8–30 ms).
 *
 *   0  reduced motion, <560px, ≤4 cores or Save-Data → CSS stand-in, zero JS
 *   1  560–820px                                     → aurora wash only
 *   2  ≥821px                                        → aurora + trace network
 */
import { reduced } from "../motion/env";

export type BgTier = 0 | 1 | 2;

export function bgTier(): BgTier {
  const cores = navigator.hardwareConcurrency ?? 8;
  const saveData =
    (navigator as unknown as { connection?: { saveData?: boolean } }).connection
      ?.saveData === true;
  if (reduced || window.innerWidth < 560 || cores <= 4 || saveData) return 0;
  return window.innerWidth >= 821 ? 2 : 1;
}

/**
 * Tier 0, and the fallback for a failed GL init: two palette radial gradients
 * painted by CSS. Nothing else runs.
 *
 * The bitmap is zeroed first because a canvas with a live drawing buffer paints
 * over its own background-image — on the failure path (a context that was
 * created and then died) the gradients would otherwise never be visible.
 */
export function staticBackdrop(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
  canvas.classList.add("is-static");
}
