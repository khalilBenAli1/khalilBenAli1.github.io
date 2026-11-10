/**
 * Keep homepage controller.
 *
 * The document is complete without this file. It adds three things: the road
 * position that the 3D scene follows as the page scrolls, the small states that
 * depend on where the visitor is (current nav link, lit career markers, title
 * reveals), and the motion preference.
 *
 * `data-scene` on the root reports what the visitor is getting:
 * pending → live | lite (asked for, or reduced data) | unsupported.
 */
import type { KeepScene } from "./scene";

const MOTION_KEY = "kb-keep-motion";

const root = document.querySelector<HTMLElement>("[data-keep-root]");
if (root) start(root);

function start(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-keep-canvas]");
  const motionButton = root.querySelector<HTMLButtonElement>("[data-keep-motion]");
  const passages = [...root.querySelectorAll<HTMLElement>("[data-keep-passage]")];
  const milestones = [...root.querySelectorAll<HTMLElement>("[data-keep-milestone]")];
  const links = [...root.querySelectorAll<HTMLAnchorElement>("[data-keep-link]")];
  const sectionIds = ["work", "about", "experience", "contact"] as const;
  const sections = sectionIds.map((id) => document.getElementById(id));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  let scene: KeepScene | null = null;
  let stops: number[] = [];
  let queued = false;

  function storedMotion(): boolean {
    try {
      return localStorage.getItem(MOTION_KEY) !== "off";
    } catch {
      return true;
    }
  }
  let wantsMotion = storedMotion();
  const motionEnabled = (): boolean => wantsMotion && !reduced.matches;

  /* ---------- road position ---------- */

  /** Scroll offsets at which the camera reaches each station (see scene.ts). */
  function measure(): void {
    const view = window.innerHeight;
    const end = Math.max(document.documentElement.scrollHeight - view, 1);
    const top = (element: HTMLElement | null): number =>
      element ? element.getBoundingClientRect().top + window.scrollY : end;
    const raw = [
      0,
      top(sections[0]),
      top(sections[1]),
      top(sections[2]),
      top(sections[3]) - view * 0.55,
      end,
    ];
    /* Keep the offsets strictly increasing whatever the content heights are. */
    stops = raw.map((value, index) => Math.min(Math.max(value, index), end + index));
    for (let i = 1; i < stops.length; i += 1) {
      if (stops[i] <= stops[i - 1]) stops[i] = stops[i - 1] + 1;
    }
  }

  function roadPosition(): number {
    const y = window.scrollY;
    for (let i = 1; i < stops.length; i += 1) {
      if (y <= stops[i]) {
        return i - 1 + (y - stops[i - 1]) / (stops[i] - stops[i - 1]);
      }
    }
    return stops.length - 1;
  }

  /* ---------- states that follow the scroll ---------- */

  function update(): void {
    queued = false;
    const view = window.innerHeight;
    const position = roadPosition();
    scene?.setTarget(position);

    /* Each section title settles into place as it rises into the window. */
    for (const passage of passages) {
      const rect = passage.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > view) continue;
      const entered = Math.min(Math.max(1 - rect.top / (view * 0.7), 0), 1);
      passage.style.setProperty("--enter", entered.toFixed(3));
    }

    let current = "home";
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= view * 0.45) {
        current = sectionIds[index];
      }
    });
    for (const link of links) {
      if (link.dataset.keepLink === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    root.dataset.place = current;

    /* A career marker lights once its entry has come up the page, like the
       fire that stands for it on the stair. */
    for (const milestone of milestones) {
      const lit = milestone.getBoundingClientRect().top < view * 0.72;
      milestone.classList.toggle("is-lit", lit);
    }
  }

  function queue(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function relayout(): void {
    measure();
    scene?.resize();
    queue();
  }

  /* ---------- motion preference ---------- */

  function showMotion(): void {
    const enabled = motionEnabled();
    root.dataset.motion = enabled ? "on" : "off";
    if (!motionButton) return;
    motionButton.setAttribute("aria-pressed", String(enabled));
    motionButton.textContent =
      (enabled ? motionButton.dataset.labelOn : motionButton.dataset.labelOff) ?? "";
    /* Nothing to toggle when the system already asks for stillness. */
    motionButton.disabled = reduced.matches;
  }

  motionButton?.addEventListener("click", () => {
    wantsMotion = !motionEnabled();
    try {
      localStorage.setItem(MOTION_KEY, wantsMotion ? "on" : "off");
    } catch {
      /* The preference still holds for this visit. */
    }
    showMotion();
    scene?.setMotion(motionEnabled());
  });
  reduced.addEventListener("change", () => {
    showMotion();
    scene?.setMotion(motionEnabled());
  });

  /* ---------- the 3D scene ---------- */

  function wantsLite(): boolean {
    if (new URLSearchParams(location.search).get("view") === "lite") return true;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    return connection?.saveData === true;
  }

  async function loadScene(): Promise<void> {
    if (!canvas) return;
    if (wantsLite()) {
      root.dataset.scene = "lite";
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const low =
      coarse || Math.min(window.innerWidth, window.innerHeight) < 700 || (memory ?? 8) <= 4;
    try {
      const { createKeepScene } = await import("./scene");
      scene = createKeepScene({
        canvas,
        low,
        motion: motionEnabled(),
        milestones: Number(root.dataset.milestones) || milestones.length,
        onLost: () => {
          scene?.dispose();
          scene = null;
          root.dataset.scene = "unsupported";
        },
      });
    } catch {
      scene = null;
    }
    if (!scene) {
      root.dataset.scene = "unsupported";
      return;
    }
    scene.setTarget(roadPosition(), true);
    root.dataset.scene = "live";
    /* For the end-to-end checks; nothing in the page reads it. */
    (window as Window & { __keepScene?: KeepScene }).__keepScene = scene;
  }

  /* ---------- local time in Faenza ---------- */

  const clock = root.querySelector<HTMLElement>("[data-keep-clock]");
  function tellTime(): void {
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(new Date());
  }

  /* ---------- go ---------- */

  root.classList.add("keep-enhanced");
  if (motionButton) motionButton.hidden = false;
  showMotion();
  measure();
  update();
  tellTime();
  window.setInterval(tellTime, 30_000);

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  /* Lazy images and late fonts change section heights after first layout. */
  if ("ResizeObserver" in window) {
    new ResizeObserver(relayout).observe(document.body);
  }

  /* The text is the first paint; the world arrives after it. */
  const idle = (window as Window & { requestIdleCallback?: (run: () => void) => void })
    .requestIdleCallback;
  if (idle) idle(() => void loadScene());
  else window.setTimeout(() => void loadScene(), 60);
}
