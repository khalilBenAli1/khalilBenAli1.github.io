import { isIslandHash, parseIslandUrl } from "../../lib/island/navigation";
import {
  defaultPreferences,
  parsePreferences,
  PREFERENCE_KEY,
  resolvePresentation,
} from "../../lib/island/preferences";
import {
  sectors,
  type IslandPreferences,
  type IslandRoute,
  type IslandSceneHandle,
  type ScreenAsset,
  type WorldDestination,
} from "../../lib/island/types";

function boot(): void {
  const candidate = document.querySelector<HTMLElement>("[data-island-root]");
  if (!candidate || candidate.dataset.bound === "true") return;
  const root: HTMLElement = candidate;
  const stage = root.querySelector<HTMLElement>("[data-island-stage]");
  let canvas = root.querySelector<HTMLCanvasElement>("[data-island-canvas]");
  if (!stage || !canvas) return;
  root.dataset.bound = "true";
  const events = new AbortController();
  const { signal } = events;
  const panels = [...root.querySelectorAll<HTMLElement>("[data-island-panel]")];
  const projectIds = [
    ...root.querySelectorAll<HTMLElement>(
      '[data-island-project],[id^="project-"]',
    ),
  ].map((el) => el.dataset.islandProject ?? el.id.replace(/^project-/, ""));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  const motionButton = root.querySelector<HTMLButtonElement>(
    "[data-island-motion]",
  );
  const viewButton =
    root.querySelector<HTMLButtonElement>("[data-island-view]");
  const status = root.querySelector<HTMLElement>("[data-island-status]");
  const hotspots = [
    ...root.querySelectorAll<HTMLAnchorElement>("[data-island-hotspot]"),
  ];
  let preferences: IslandPreferences = defaultPreferences();
  try {
    preferences = parsePreferences(localStorage.getItem(PREFERENCE_KEY));
  } catch {
    /* Session controls still work when storage is blocked. */
  }
  let route: IslandRoute = parseIslandUrl(location.href, projectIds);
  let scene: IslandSceneHandle | null = null;
  let sceneAbort: AbortController | null = null;
  let generation = 0;
  let disposed = false;
  let runtimeFailed = false;
  let activeQuality: string | null = null;
  let pendingIdle: number | null = null;
  let idleUsesCallback = false;
  let resizeTimer = 0;
  let clockTimer = 0;
  let previousHref = "";
  let returnFocus: HTMLElement | null = null;
  const metrics = () => {
    root.dataset.islandMetrics = JSON.stringify(
      scene?.getMetrics() ?? {
        status: root.dataset.sceneStatus ?? "lite",
        frames: 0,
        loopActive: false,
      },
    );
  };
  function persist(): void {
    try {
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    } catch {
      /* No persistent preference is required to navigate. */
    }
  }
  function setStatus(
    value: "loading" | "ready" | "lite" | "unsupported" | "lost",
  ): void {
    root.dataset.sceneStatus = value;
    stage!.dataset.sceneStatus = value;
    if (status)
      status.textContent =
        value === "loading"
          ? (status.dataset.statusLoading ?? "")
          : value === "unsupported" || value === "lost"
            ? (status.dataset.statusUnsupported ?? "")
            : value === "lite"
              ? (status.dataset.statusLite ?? "")
              : "";
  }
  function label(
    button: HTMLButtonElement | null,
    text: string | undefined,
  ): void {
    if (button) {
      const node = button.querySelector("[data-island-control-label]");
      if (node) node.textContent = text ?? "";
    }
  }
  function device() {
    return {
      width: document.documentElement.clientWidth,
      coarse: coarse.matches,
      saveData:
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData === true,
      cores: navigator.hardwareConcurrency || 8,
      reduced: reduced.matches,
    };
  }
  function clearPending(): void {
    if (pendingIdle !== null) {
      if (idleUsesCallback) cancelIdleCallback(pendingIdle);
      else clearTimeout(pendingIdle);
      pendingIdle = null;
    }
  }
  function stopScene(): void {
    clearPending();
    generation++;
    const old = scene;
    scene = null;
    sceneAbort?.abort();
    sceneAbort = null;
    old?.dispose();
    activeQuality = null;
    canvas!.style.visibility = "hidden";
    for (const el of hotspots) {
      el.style.removeProperty("left");
      el.style.removeProperty("top");
      el.hidden = false;
    }
  }
  function screens(): readonly ScreenAsset[] {
    try {
      const raw: unknown = JSON.parse(
        root.querySelector("[data-island-screens]")?.textContent ?? "[]",
      );
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (entry): entry is ScreenAsset =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.src === "string" &&
          entry.src.startsWith("/island/screens/") &&
          typeof entry.label === "string" &&
          sectors.includes(entry.sector),
      );
    } catch {
      return [];
    }
  }
  async function startScene(
    quality: "low" | "high",
    motion: boolean,
  ): Promise<void> {
    stopScene();
    const token = generation;
    sceneAbort = new AbortController();
    const abort = sceneAbort;
    const previous = canvas!;
    canvas = previous.cloneNode(false) as HTMLCanvasElement;
    previous.replaceWith(canvas);
    canvas.style.visibility = "hidden";
    setStatus("loading");
    root.dataset.view = "3d";
    activeQuality = quality;
    try {
      const { createIslandScene } = await import("./scene/index");
      if (disposed || abort.signal.aborted || token !== generation) return;
      const handle = await createIslandScene({
        canvas,
        screens: screens(),
        initialDestination: route.destination,
        quality,
        motion,
        signal: abort.signal,
        onActivate: (destination) => navigateHash(destination),
        onHotspots: (points) => {
          if (disposed || abort.signal.aborted) return;
          for (const point of points) {
            const el = hotspots.find(
              (node) => node.dataset.islandHotspot === point.destination,
            );
            if (!el) continue;
            el.hidden = !point.visible;
            const half = el.offsetWidth / 2 + 8;
            const x = Math.max(
              half,
              Math.min(stage!.clientWidth - half, point.x),
            );
            const y = Math.max(
              el.offsetHeight + 12,
              Math.min(stage!.clientHeight - 22, point.y),
            );
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
          }
          metrics();
          stage!.dispatchEvent(new Event("island:frame"));
        },
        onStatus: (value) => {
          if (disposed || abort.signal.aborted || token !== generation) return;
          if (value === "lost" || value === "unsupported") {
            runtimeFailed = true;
            canvas!.style.visibility = "hidden";
            root.dataset.view = "lite";
            setStatus(value);
            updateControlLabels();
          }
        },
      });
      if (disposed || abort.signal.aborted || token !== generation) {
        handle?.dispose();
        return;
      }
      if (!handle) {
        runtimeFailed = true;
        root.dataset.view = "lite";
        setStatus("unsupported");
        activeQuality = null;
        updateControlLabels();
        return;
      }
      scene = handle;
      const latest = resolvePresentation(
        preferences,
        device(),
        new URL(location.href).searchParams.get("view"),
      );
      handle.setMotion(latest.motion);
      handle.setDestination(route.destination, !latest.motion);
      canvas.style.visibility = "visible";
      setStatus("ready");
      metrics();
    } catch {
      if (disposed || abort.signal.aborted || token !== generation) return;
      runtimeFailed = true;
      stopScene();
      root.dataset.view = "lite";
      setStatus("unsupported");
      updateControlLabels();
    }
  }
  function updateControlLabels(): void {
    const motionAllowed = !reduced.matches && preferences.motion !== "off";
    if (motionButton) {
      motionButton.disabled = reduced.matches;
      motionButton.setAttribute("aria-pressed", String(motionAllowed));
      label(
        motionButton,
        reduced.matches
          ? motionButton.dataset.labelReduced
          : motionAllowed
            ? motionButton.dataset.labelOn
            : motionButton.dataset.labelOff,
      );
    }
    if (viewButton) {
      viewButton.disabled = false;
      const full = root.dataset.view === "3d";
      viewButton.setAttribute("aria-pressed", String(full));
      label(
        viewButton,
        full
          ? (viewButton.getAttribute("data-label-3d") ?? "3D view")
          : viewButton.dataset.labelLite,
      );
    }
    root.dataset.motion = motionAllowed ? "on" : "off";
  }
  function updatePresentation(): void {
    if (disposed) return;
    const presentation = resolvePresentation(
      preferences,
      device(),
      new URL(location.href).searchParams.get("view"),
    );
    if (presentation.view === "lite" || runtimeFailed) {
      stopScene();
      root.dataset.view = "lite";
      setStatus(runtimeFailed ? "unsupported" : "lite");
      updateControlLabels();
      metrics();
      return;
    }
    root.dataset.view = "3d";
    updateControlLabels();
    if (scene && activeQuality === presentation.quality) {
      scene.setMotion(presentation.motion);
      scene.resize();
      metrics();
      return;
    }
    if (
      activeQuality === presentation.quality &&
      sceneAbort &&
      !sceneAbort.signal.aborted
    )
      return;
    clearPending();
    const run = () => {
      pendingIdle = null;
      void startScene(presentation.quality, presentation.motion);
    };
    if (typeof window.requestIdleCallback === "function") {
      idleUsesCallback = true;
      pendingIdle = requestIdleCallback(run, { timeout: 1200 });
    } else {
      idleUsesCallback = false;
      pendingIdle = window.setTimeout(run, 0);
    }
  }
  function clock(): void {
    clearTimeout(clockTimer);
    if (disposed || document.hidden) return;
    const locale = root.dataset.locale ?? "en";
    const value = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Rome",
    }).format(new Date());
    root
      .querySelectorAll("[data-local-time]")
      .forEach((el) => (el.textContent = value));
    clockTimer = window.setTimeout(clock, 60000);
  }
  function focusForRoute(isInitial: boolean, old: IslandRoute): void {
    if (isInitial) return;
    if (
      old.destination === route.destination &&
      old.projectId === route.projectId &&
      old.aboutSection === route.aboutSection
    )
      return;
    if (route.destination === "home") {
      window.scrollTo({ top: 0, behavior: "instant" });
      const target =
        returnFocus?.isConnected && returnFocus.getClientRects().length
          ? returnFocus
          : root.querySelector<HTMLElement>('[data-island-nav="home"]');
      target?.focus({ preventScroll: true });
      returnFocus = null;
      return;
    }
    const panel = panels.find(
      (el) => el.dataset.islandPanel === route.destination,
    );
    const target = route.projectId
      ? document.getElementById(`project-${route.projectId}`)
      : route.aboutSection
        ? document.getElementById(route.aboutSection)
        : panel?.querySelector<HTMLElement>("[data-island-heading]");
    if (target instanceof HTMLElement) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      const box = target.getBoundingClientRect();
      if (box.top < 100 || box.bottom > innerHeight - 24)
        target.scrollIntoView({ block: "start", behavior: "instant" });
    }
    if (old.projectId && !route.projectId)
      root
        .querySelector<HTMLElement>(
          `[href="#project-${CSS.escape(old.projectId)}"]`,
        )
        ?.focus({ preventScroll: true });
  }
  function syncRoute(initial = false): void {
    if (disposed) return;
    if (!initial && location.href === previousHref) return;
    const old = route;
    route = parseIslandUrl(location.href, projectIds);
    previousHref = location.href;
    root.dataset.destination = route.destination;
    document.documentElement.dataset.destination = route.destination;
    root.dataset.selectedProject = route.projectId ?? "";
    root.dataset.sector = route.sector;
    for (const panel of panels)
      panel.hidden = panel.dataset.islandPanel !== route.destination;
    root
      .querySelectorAll<HTMLAnchorElement>("[data-island-nav]")
      .forEach((el) => {
        if (el.dataset.islandNav === route.destination)
          el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
    root
      .querySelectorAll<HTMLAnchorElement>("[data-island-language]")
      .forEach((el) => {
        const target = new URL(el.getAttribute("href") ?? "/", location.origin);
        target.search = location.search;
        target.hash = location.hash;
        el.href = target.pathname + target.search + target.hash;
      });
    root.dispatchEvent(new CustomEvent("island:route", { detail: route }));
    scene?.setDestination(
      route.destination,
      reduced.matches || preferences.motion === "off",
    );
    focusForRoute(initial, old);
    metrics();
  }
  function navigate(url: URL, trigger?: HTMLElement): void {
    const next = parseIslandUrl(url, projectIds);
    if (
      trigger &&
      next.destination !== "home" &&
      (route.destination === "home" || (!route.projectId && next.projectId))
    )
      returnFocus = trigger;
    if (url.href !== location.href)
      history.pushState(null, "", url.pathname + url.search + url.hash);
    syncRoute();
  }
  function navigateHash(destination: string): void {
    const url = new URL(location.href);
    url.hash = destination;
    navigate(url);
  }
  root.addEventListener(
    "click",
    (event) => {
      if (
        !(event instanceof MouseEvent) ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        !isIslandHash(url.hash, projectIds)
      )
        return;
      event.preventDefault();
      navigate(url, anchor);
    },
    { signal },
  );
  document.querySelector<HTMLAnchorElement>(".skip-link")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      const main = document.getElementById("main-content");
      main?.setAttribute("tabindex", "-1");
      main?.focus();
    },
    { signal },
  );
  root.addEventListener(
    "change",
    (event) => {
      const select =
        event.target instanceof HTMLSelectElement ? event.target : null;
      const radio =
        event.target instanceof HTMLInputElement ? event.target : null;
      const value = select?.matches("[data-island-filter]")
        ? select.value
        : radio?.matches("[data-island-filter]")
          ? radio.value
          : null;
      if (value === null || !sectors.includes(value as never)) return;
      const url = new URL(location.href);
      value === "all"
        ? url.searchParams.delete("sector")
        : url.searchParams.set("sector", value);
      url.hash = "work";
      navigate(url);
    },
    { signal },
  );
  window.addEventListener("popstate", () => syncRoute(), { signal });
  window.addEventListener("hashchange", () => syncRoute(), { signal });
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || route.destination === "home") return;
      event.preventDefault();
      navigateHash(route.projectId ? "work" : "home");
    },
    { signal },
  );
  for (const el of hotspots) {
    const destination = el.dataset.islandHotspot as WorldDestination;
    el.addEventListener("focus", () => scene?.setFocus(destination), {
      signal,
    });
    el.addEventListener("blur", () => scene?.setFocus(null), { signal });
  }
  motionButton?.addEventListener(
    "click",
    () => {
      preferences = {
        ...preferences,
        motion: preferences.motion === "off" ? "system" : "off",
      };
      persist();
      updatePresentation();
    },
    { signal },
  );
  viewButton?.addEventListener(
    "click",
    () => {
      runtimeFailed = false;
      preferences = {
        ...preferences,
        view: root.dataset.view === "3d" ? "lite" : "3d",
      };
      const url = new URL(location.href);
      url.searchParams.delete("view");
      history.replaceState(null, "", url);
      persist();
      updatePresentation();
    },
    { signal },
  );
  reduced.addEventListener("change", updatePresentation, { signal });
  coarse.addEventListener("change", updatePresentation, { signal });
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updatePresentation, 150);
    },
    { signal },
  );
  document.addEventListener("visibilitychange", clock, { signal });
  root.addEventListener("island:inspect", metrics, { signal });
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    stopScene();
    clearTimeout(resizeTimer);
    clearTimeout(clockTimer);
    events.abort();
    root.dataset.bound = "false";
    root.classList.remove("island-enhanced");
    document.documentElement.classList.remove("island-enhanced");
    for (const panel of panels) panel.hidden = false;
    metrics();
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) dispose();
    },
    { signal },
  );
  document.addEventListener("astro:before-swap", dispose, { signal });
  root.addEventListener("island:dispose", dispose, { signal });
  canvas.style.visibility = "hidden";
  root.classList.add("island-enhanced");
  document.documentElement.classList.add("island-enhanced");
  syncRoute(true);
  clock();
  updatePresentation();
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
document.addEventListener("astro:page-load", boot);
