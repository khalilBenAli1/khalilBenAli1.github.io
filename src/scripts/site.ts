/** Site runtime: nav, reveals, diagram animation, tilt, magnetic buttons. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- three.js background (lazy) ---------- */
const spaceCanvas = document.getElementById(
  "space-canvas",
) as HTMLCanvasElement | null;
if (spaceCanvas) {
  const boot = () =>
    import("./space").then(({ initSpace }) => initSpace(spaceCanvas));
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => boot(), { timeout: 1200 });
  } else {
    setTimeout(boot, 250);
  }
}

/* ---------- hero load sequence ---------- */
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.body.classList.add("is-loaded")),
);

/* ---------- scroll reveals ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealIO.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.16 },
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- diagrams: draw-in + traveling pulses ---------- */
interface Pulse {
  path: SVGPathElement;
  dot: SVGCircleElement;
  length: number;
  offset: number;
  card: HTMLElement | null;
}

const pulses: Pulse[] = [];
const activeDiagrams = new Set<SVGSVGElement>();

const diagramIO = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const svg = entry.target as SVGSVGElement;
      if (entry.isIntersecting) {
        svg.classList.add("is-drawn");
        activeDiagrams.add(svg);
      } else {
        activeDiagrams.delete(svg);
      }
    }
  },
  { threshold: 0.25 },
);

document.querySelectorAll<SVGSVGElement>("svg[data-diagram]").forEach((svg) => {
  diagramIO.observe(svg);
  if (reduced) {
    svg.classList.add("is-drawn");
    return;
  }
  const gradient = svg.querySelector("linearGradient");
  const fill = gradient ? `url(#${gradient.id})` : "#7c5cff";
  const card = svg.closest<HTMLElement>(".project");
  svg.querySelectorAll<SVGPathElement>("path[data-edge]").forEach((path, i) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "3.2");
    dot.setAttribute("fill", fill);
    dot.setAttribute("opacity", "0");
    svg.appendChild(dot);
    pulses.push({
      path,
      dot,
      length: path.getTotalLength(),
      offset: i * 0.24,
      card,
    });
  });
});

if (pulses.length && !reduced) {
  const DURATION = 2600;
  const tickPulses = (now: number) => {
    for (const p of pulses) {
      const svg = p.path.ownerSVGElement;
      if (
        !svg ||
        !activeDiagrams.has(svg) ||
        !svg.classList.contains("is-drawn")
      ) {
        p.dot.setAttribute("opacity", "0");
        continue;
      }
      const speed = p.card?.matches(":hover") ? 1.5 : 1;
      const t = ((now * speed) / DURATION + p.offset) % 1;
      const pt = p.path.getPointAtLength(t * p.length);
      p.dot.setAttribute("cx", String(pt.x));
      p.dot.setAttribute("cy", String(pt.y));
      p.dot.setAttribute("opacity", t < 0.04 || t > 0.96 ? "0" : "0.95");
    }
    requestAnimationFrame(tickPulses);
  };
  requestAnimationFrame(tickPulses);
}

/* ---------- nav: progress bar, active link, mobile menu ---------- */
const progress = document.querySelector<HTMLElement>("[data-nav-progress]");
if (progress) {
  let raf = 0;
  const update = () => {
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

const navLinks = new Map<string, HTMLAnchorElement>();
document
  .querySelectorAll<HTMLAnchorElement>("[data-nav-link]")
  .forEach((a) => navLinks.set(a.dataset.navLink ?? "", a));

if (navLinks.size) {
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

const burger = document.querySelector<HTMLButtonElement>("[data-nav-burger]");
const overlay = document.querySelector<HTMLElement>("[data-nav-overlay]");
const closeBtn = document.querySelector<HTMLButtonElement>("[data-nav-close]");

function setMenu(open: boolean): void {
  if (!overlay || !burger) return;
  overlay.hidden = !open;
  burger.setAttribute("aria-expanded", String(open));
  requestAnimationFrame(() => overlay.classList.toggle("is-open", open));
  document.documentElement.style.overflow = open ? "hidden" : "";
  if (open) closeBtn?.focus();
  else burger.focus();
}

burger?.addEventListener("click", () => setMenu(true));
closeBtn?.addEventListener("click", () => setMenu(false));
overlay
  ?.querySelectorAll("[data-nav-overlay-link]")
  .forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.hidden) setMenu(false);
});

/* ---------- scroll cue fade ---------- */
const cue = document.querySelector<HTMLElement>("[data-scroll-cue]");
if (cue) {
  window.addEventListener(
    "scroll",
    () => {
      cue.style.opacity = window.scrollY > 60 ? "0" : "1";
    },
    { passive: true },
  );
}

/* ---------- hero photo tilt ---------- */
const tiltEl = document.querySelector<HTMLElement>("[data-tilt]");
if (tiltEl && finePointer && !reduced) {
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let rafTilt = 0;
  const render = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    tiltEl.style.transform = `perspective(900px) rotateX(${cy}deg) rotateY(${cx}deg)`;
    if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
      rafTilt = requestAnimationFrame(render);
    } else {
      rafTilt = 0;
    }
  };
  tiltEl.addEventListener("mousemove", (e) => {
    const r = tiltEl.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 12;
    ty = -((e.clientY - r.top) / r.height - 0.5) * 12;
    if (!rafTilt) rafTilt = requestAnimationFrame(render);
  });
  tiltEl.addEventListener("mouseleave", () => {
    tx = 0;
    ty = 0;
    if (!rafTilt) rafTilt = requestAnimationFrame(render);
  });
}

/* ---------- magnetic buttons ---------- */
if (finePointer && !reduced) {
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 12;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 12;
      el.style.transform = `translate(${mx}px, ${my}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
}
