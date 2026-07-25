/**
 * Diagram runtime.
 *
 * All ambient motion is declarative (SMIL `animateMotion` + CSS transitions),
 * so this module only has to: gate the SMIL clock on visibility, fire the
 * one-shot draw-in, strip the dash arrays once they land, wire focus mode, and
 * flatten everything for `prefers-reduced-motion`.
 *
 * There is deliberately no requestAnimationFrame loop.
 */

type Diagram = SVGSVGElement;

const IDLE_BACKSTOP = 400;
const FOCUS_GRACE = 60;

function pause(svg: Diagram): void {
  try {
    svg.pauseAnimations();
  } catch {
    /* SMIL unavailable — packets simply run free */
  }
}

function unpause(svg: Diagram): void {
  try {
    svg.unpauseAnimations();
  } catch {
    /* no-op */
  }
}

/** packets/LEDs use `begin` offsets measured from the draw-in, so start at 0 */
function resetClock(svg: Diagram): void {
  try {
    svg.setCurrentTime(0);
  } catch {
    /* no-op */
  }
}

/**
 * Detach for each diagram's transitionend watcher, so whichever of the two paths
 * to `.is-idle` gets there first also takes the listener down. The backstop used
 * to leave it attached, and every hover-driven opacity transition afterwards then
 * ran the edge-counting handler for the life of the page.
 */
const watchers = new WeakMap<Diagram, () => void>();

/** the ambient state must have zero dash animation left running */
function markIdle(svg: Diagram): void {
  svg.classList.add("is-idle");
  const detach = watchers.get(svg);
  if (detach) {
    detach();
    watchers.delete(svg);
  }
}

/**
 * `.is-idle` once every edge has finished drawing. transitionend is the precise
 * signal; the timeout is the backstop for when transitions never fire (e.g. the
 * card is display:none at the time it scrolls in).
 */
function watchEdges(svg: Diagram): void {
  const total = svg.querySelectorAll("[data-edge]").length;
  if (total === 0) {
    markIdle(svg);
    return;
  }
  let done = 0;
  const onEnd = (event: Event): void => {
    const te = event as TransitionEvent;
    if (te.propertyName !== "stroke-dashoffset") return;
    const target = te.target as Element | null;
    if (!target || !target.hasAttribute("data-edge")) return;
    done += 1;
    if (done < total) return;
    markIdle(svg);
  };
  svg.addEventListener("transitionend", onEnd);
  watchers.set(svg, () => svg.removeEventListener("transitionend", onEnd));
}

function scheduleIdle(svg: Diagram): void {
  const declared = Number(svg.dataset.introMs);
  const ms = Number.isFinite(declared) && declared > 0 ? declared : 2600;
  window.setTimeout(() => markIdle(svg), ms + IDLE_BACKSTOP);
}

/** reduced motion: no packets, no clock, everything already in its final state */
function makeStatic(svg: Diagram): void {
  svg.querySelectorAll("animateMotion").forEach((motion) => {
    const packet = motion.parentNode;
    packet?.parentNode?.removeChild(packet);
  });
  svg.querySelectorAll("animate").forEach((animate) => {
    animate.parentNode?.removeChild(animate);
  });
  pause(svg);
  svg.classList.add("is-drawn", "is-idle");
}

/**
 * Focus mode: hovering a node dims everything that is not adjacent to it.
 * Adjacency comes from the build-time `data-from` / `data-to` attributes, so
 * this is one pass over a precomputed list per hover — opacity only.
 */
function wireFocus(svg: Diagram): void {
  const hits = Array.from(svg.querySelectorAll<SVGElement>("[data-hit]"));
  if (hits.length === 0) return;

  const parts = Array.from(svg.querySelectorAll<SVGElement>("[data-dim][data-node]"));
  const links = Array.from(svg.querySelectorAll<SVGElement>("[data-dim][data-from]"));

  const neighbours = new Map<string, Set<string>>();
  const touch = (a: string, b: string): void => {
    const set = neighbours.get(a);
    if (set) set.add(b);
    else neighbours.set(a, new Set([b]));
  };
  for (const link of links) {
    const from = link.dataset.from ?? "";
    const to = link.dataset.to ?? "";
    touch(from, to);
    touch(to, from);
  }

  let timer = 0;

  const light = (el: SVGElement, on: boolean): void => {
    if (on) el.setAttribute("data-lit", "");
    else el.removeAttribute("data-lit");
  };

  const clear = (): void => {
    svg.classList.remove("is-focus");
    for (const el of parts) el.removeAttribute("data-lit");
    for (const el of links) el.removeAttribute("data-lit");
  };

  const focus = (id: string): void => {
    const lit = neighbours.get(id);
    for (const el of parts) {
      const node = el.dataset.node ?? "";
      light(el, node === id || (lit ? lit.has(node) : false));
    }
    for (const el of links) {
      light(el, el.dataset.from === id || el.dataset.to === id);
    }
    svg.classList.add("is-focus");
  };

  for (const hit of hits) {
    hit.addEventListener("pointerenter", () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
      focus(hit.dataset.hit ?? "");
    });
    hit.addEventListener("pointerleave", () => {
      /* grace period so sliding between adjacent nodes does not flash */
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = 0;
        clear();
      }, FOCUS_GRACE);
    });
  }
}

export function initDiagrams(): void {
  const svgs = Array.from(
    document.querySelectorAll<Diagram>("svg[data-diagram]"),
  );
  if (svgs.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* `(hover: hover)` alone is true for a stylus and for desktop-mode phones, and
     focus mode is driven by pointerenter — on those it latches a node dim that
     nothing ever clears. Same gate the rest of the site's hover affordances use. */
  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  if (reduced) {
    for (const svg of svgs) {
      makeStatic(svg);
      if (canHover) wireFocus(svg);
    }
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const svg = entry.target as Diagram;
        if (entry.isIntersecting) {
          if (!svg.classList.contains("is-drawn")) {
            svg.classList.add("is-drawn");
            scheduleIdle(svg);
          }
          unpause(svg);
        } else {
          pause(svg);
        }
      }
    },
    { threshold: 0.25 },
  );

  for (const svg of svgs) {
    pause(svg);
    resetClock(svg);
    watchEdges(svg);
    if (canHover) wireFocus(svg);
    io.observe(svg);
  }
}
