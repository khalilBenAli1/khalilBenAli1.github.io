/**
 * Site runtime — slim orchestrator.
 *
 * Everything animated lives in ./motion/* (see motion/README.md for the full
 * list of primitives, data-attributes and classes). What stays here is the page
 * chrome that isn't a motion primitive: the lazy three.js boot, the nav
 * progress bar / active link / mobile menu, and the hero scroll cue.
 *
 * The old inline diagram runtime and the old IntersectionObserver reveal system
 * are gone: diagrams moved to ./diagrams.ts, reveals to ./motion/reveal.ts.
 */
import { initDiagrams } from "./diagrams";
import { initCursor } from "./motion/cursor";
import { initMagnetic, initTilt } from "./motion/hover";
import { initMarquee } from "./motion/marquee";
import { initScrollLinked } from "./motion/parallax";
import { initPreloader } from "./motion/preloader";
import { initReveal } from "./motion/reveal";
import { initScroll, lockScroll } from "./motion/scroll";
import { initLocalTime } from "./motion/time";

/* ---------- three.js background (lazy) ---------- */
function initSpaceCanvas(): void {
  const canvas = document.getElementById(
    "space-canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const boot = (): void => {
    void import("./space").then(({ initSpace }) => initSpace(canvas));
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => boot(), { timeout: 1200 });
  } else {
    window.setTimeout(boot, 250);
  }
}

/* ---------- nav: progress bar ---------- */
function initNavProgress(): void {
  const progress = document.querySelector<HTMLElement>("[data-nav-progress]");
  if (!progress) return;
  let raf = 0;
  const update = (): void => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!raf) raf = requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/* ---------- nav: active section link ---------- */
function initNavActive(): void {
  const navLinks = new Map<string, HTMLAnchorElement>();
  document
    .querySelectorAll<HTMLAnchorElement>("[data-nav-link]")
    .forEach((a) => navLinks.set(a.dataset.navLink ?? "", a));
  if (!navLinks.size) return;

  const sectionIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          navLinks.forEach((a, id) =>
            a.classList.toggle("is-active", id === entry.target.id),
          );
        }
      }
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  navLinks.forEach((_a, id) => {
    const section = document.getElementById(id);
    if (section) sectionIO.observe(section);
  });
}

/* ---------- nav: mobile menu ----------
   The overlay is a modal, so nothing behind it may be reachable. Two mechanisms,
   because either alone leaks: `inert` takes the rest of the page out of the tab
   order *and* out of the accessible tree (screen-reader swipe included), and the
   Tab wrap keeps a cycle inside the overlay. Note that the overlay is a sibling
   of the nav bar inside <header>, so the bar container is inerted, never the
   header itself. */
function initNavMenu(): void {
  const burger = document.querySelector<HTMLButtonElement>("[data-nav-burger]");
  const overlay = document.querySelector<HTMLElement>("[data-nav-overlay]");
  const closeBtn =
    document.querySelector<HTMLButtonElement>("[data-nav-close]");
  if (!burger || !overlay) return;

  // Everything focusable in the document that is NOT inside the overlay.
  const outside = Array.from(
    document.querySelectorAll<HTMLElement>(
      "main, footer, .site-nav__inner, .skip-link",
    ),
  );

  const stops = (): HTMLElement[] =>
    Array.from(
      overlay.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    ).filter((el) => el.offsetParent !== null);

  const setMenu = (open: boolean): void => {
    overlay.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    requestAnimationFrame(() => overlay.classList.toggle("is-open", open));
    // Stops Lenis as well as native scroll.
    lockScroll(open);
    for (const el of outside) el.inert = open;
    // preventScroll: the overlay is position:fixed, so a scroll-into-view here
    // would move the page underneath it and the position would be lost on close.
    if (open) closeBtn?.focus({ preventScroll: true });
    else burger.focus({ preventScroll: true });
  };

  burger.addEventListener("click", () => setMenu(true));
  closeBtn?.addEventListener("click", () => setMenu(false));
  overlay
    .querySelectorAll("[data-nav-overlay-link]")
    .forEach((a) => a.addEventListener("click", () => setMenu(false)));

  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      setMenu(false);
      return;
    }
    if (e.key !== "Tab") return;
    const items = stops();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !overlay.contains(active))) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
}

/* ---------- hero scroll cue fade ---------- */
function initScrollCue(): void {
  const cue = document.querySelector<HTMLElement>("[data-scroll-cue]");
  if (!cue) return;
  window.addEventListener(
    "scroll",
    () => {
      cue.style.opacity = window.scrollY > 60 ? "0" : "1";
    },
    { passive: true },
  );
}

/* ---------- boot ---------- */
function boot(): void {
  // Curtain first so its counter starts on the same frame the script runs.
  initPreloader();
  initScroll();

  initNavProgress();
  initNavActive();
  initNavMenu();
  initScrollCue();

  initCursor();
  initMagnetic();
  initTilt();
  initMarquee();
  initScrollLinked();
  initLocalTime();

  initDiagrams();
  void initReveal();

  initSpaceCanvas();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
