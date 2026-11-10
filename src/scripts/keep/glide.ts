/**
 * Eased wheel scrolling for mouse and trackpad.
 *
 * A mouse wheel moves the page in steps; this turns the steps into a glide, so
 * the reading column and the camera travel together. Touch screens keep their
 * own momentum and never load this. Lenis writes the real scroll position each
 * frame, so everything else on the page keeps reading ordinary scroll events.
 */
import Lenis from "lenis";

export interface Glide {
  stop(): void;
}

function target(hash: string): HTMLElement | null | undefined {
  if (hash === "#top" || hash === "#home") return null;
  try {
    return document.querySelector<HTMLElement>(hash) ?? undefined;
  } catch {
    return undefined;
  }
}

export function startGlide(): Glide {
  const lenis = new Lenis({ lerp: 0.105, wheelMultiplier: 1, autoRaf: true });
  let landingFocus = false;

  /* Lenis owns the position, so it also owns in-page jumps. */
  const onClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const href = event.target.closest("a")?.getAttribute("href");
    if (!href || href.length < 2 || !href.startsWith("#")) return;
    const element = target(href);
    if (element === undefined) return;

    event.preventDefault();
    lenis.scrollTo(element ?? 0);
    if (window.location.hash !== href) window.history.pushState(null, "", href);
    /* A native jump also moves where Tab continues from; keep that. */
    const landing = element ?? document.getElementById("main-content");
    if (landing) {
      if (!landing.hasAttribute("tabindex")) landing.setAttribute("tabindex", "-1");
      landingFocus = true;
      landing.focus({ preventScroll: true });
      landingFocus = false;
    }
  };

  /* Tabbing to something off screen scrolls natively; a glide still in flight
     would pull the page back, so it is dropped in favour of the focus. */
  const onFocus = (event: FocusEvent): void => {
    if (landingFocus || !(event.target instanceof HTMLElement) || !lenis.isScrolling) return;
    if (event.target.matches(":focus-visible")) lenis.scrollTo(window.scrollY, { immediate: true });
  };

  document.addEventListener("click", onClick);
  document.addEventListener("focusin", onFocus);

  return {
    stop() {
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
      lenis.destroy();
    },
  };
}
