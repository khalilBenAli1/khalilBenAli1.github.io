/**
 * Lenis smooth scroll, driven by the GSAP ticker.
 *
 * Driving Lenis from gsap.ticker instead of its own rAF is what removes the
 * one-frame lag between the scroll position and every scrubbed animation.
 * Under prefers-reduced-motion Lenis is never constructed — the page falls
 * back to native scroll and every other module still works, because nav
 * progress, the scroll cue and ScrollTrigger all read real scroll events.
 */
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { reduced } from "./env";

let lenis: Lenis | null = null;

function resolveAnchor(hash: string): HTMLElement | null | undefined {
  if (hash === "#top") return null; // null === document top
  try {
    return document.querySelector<HTMLElement>(hash) ?? undefined;
  } catch {
    return undefined; // not a valid selector (e.g. "#1")
  }
}

/**
 * No offset on purpose. Lenis reads `scroll-padding-top` off the scroll root and
 * subtracts it itself, so base.css owns the nav clearance for every landing —
 * Lenis-driven nav clicks, native deep links, and `scrollIntoView` alike. Adding
 * an offset here double-compensated and overshot the target by a full nav height.
 */
function goTo(hash: string, immediate = false): void {
  if (!lenis) return;
  const el = resolveAnchor(hash);
  if (el === undefined) return;
  if (el === null) lenis.scrollTo(0, { immediate });
  else lenis.scrollTo(el, { immediate });
}

function onAnchorClick(event: MouseEvent): void {
  if (
    !lenis ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest("a");
  const href = link?.getAttribute("href");
  if (!href || href.length < 2 || !href.startsWith("#")) return;
  if (resolveAnchor(href) === undefined) return;

  event.preventDefault();
  goTo(href);
  if (window.location.hash !== href) {
    window.history.pushState(null, "", href);
  }
}

/**
 * Keyboard focus has to move the Lenis position, not the browser's.
 *
 * Tabbing to an off-screen element makes the browser scroll the real scroll
 * position to it, but Lenis's `animatedScroll` still holds the old value and
 * writes it back on the next frame — the page snaps away from the element that
 * just took focus. Routing the same move through Lenis keeps both in agreement.
 */
function navHeight(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--nav-h",
  );
  return parseFloat(raw) || 68;
}

/**
 * A fixed element cannot be scrolled into view: its rect is the same at every
 * scroll position. The nav bar's own controls sit under the fixed header and so
 * read as "above the fold" — chasing them scrolled the page by a nav height
 * every time the burger or a nav link took focus, and closing the mobile overlay
 * lost the reader's place.
 */
function isFixed(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    if (getComputedStyle(n).position === "fixed") return true;
  }
  return false;
}

function onFocusIn(event: FocusEvent): void {
  const el = event.target;
  if (!lenis || !(el instanceof HTMLElement)) return;
  const rect = el.getBoundingClientRect();
  const inView = rect.top >= navHeight() && rect.bottom <= window.innerHeight;
  if (inView || isFixed(el)) return;
  // scroll-padding-top (base.css) supplies the nav clearance — see goTo().
  lenis.scrollTo(el);
}

export function initScroll(): void {
  if (reduced || lenis) return;

  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });

  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchors: Lenis owns the scroll position, so let it own the jump too.
  document.addEventListener("click", onAnchorClick);
  document.addEventListener("focusin", onFocusIn);
  window.addEventListener("hashchange", () => goTo(window.location.hash));
  if (window.location.hash) goTo(window.location.hash, true);
}

/** Nav overlay / modal open. Also blocks native scroll for the no-Lenis path. */
export function lockScroll(locked: boolean): void {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** Call after any layout-changing class toggle or late-loading media. */
export function refreshScroll(): void {
  ScrollTrigger.refresh();
}

/** Escape hatch for Wave 2 (e.g. a back-to-top button). */
export function getLenis(): Lenis | null {
  return lenis;
}
