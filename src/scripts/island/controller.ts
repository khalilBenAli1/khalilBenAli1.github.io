import { islandPosters, destinationPosters } from "../../lib/island/posters";
import { isIslandHash, parseIslandUrl } from "../../lib/island/navigation";
import { createIslandTransitions } from "./transitions";
import {
  defaultPreferences,
  parsePreferences,
  PREFERENCE_KEY,
  resolvePresentation,
} from "../../lib/island/preferences";
import {
  sectors,
  type IslandExhibitSelection,
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
  const transitions = createIslandTransitions(root, stage);
  root.dataset.bound = "true";
  const events = new AbortController();
  const { signal } = events;
  const panels = [...root.querySelectorAll<HTMLElement>("[data-island-panel]")];
  const cards = [...root.querySelectorAll<HTMLElement>("[data-island-card]")];
  const projectIds = cards.map((el) => el.dataset.islandCard!);
  const exhibitCache = new Map<string, IslandExhibitSelection>();
  const milestoneButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-island-milestone]"),
  ].filter((button) => /^[0-3]$/.test(button.dataset.islandMilestone ?? ""));
  const milestoneEntries = [
    ...root.querySelectorAll<HTMLElement>("[data-island-milestone-entry]"),
  ];
  let selectedMilestone: number | null = null;
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
  let projectReturnFocus: HTMLElement | null = null;
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
  function syncPoster(): void {
    if (root.dataset.view === "3d" && root.dataset.sceneStatus === "ready")
      return;
    const pose =
      route.destination === "home"
        ? islandPosters
        : (destinationPosters[route.destination] ?? islandPosters);
    const image = root.querySelector<HTMLImageElement>(
      "[data-island-poster] img",
    );
    const source = root.querySelector<HTMLSourceElement>(
      "[data-island-poster] source",
    );
    if (image && pose.desktop && image.getAttribute("src") !== pose.desktop)
      image.src = pose.desktop;
    if (source && pose.mobile) {
      source.media =
        route.destination === "home"
          ? "(max-width: 600px)"
          : "(max-width: 900px)";
      if (source.getAttribute("srcset") !== pose.mobile)
        source.srcset = pose.mobile;
    }
  }
  function setStatus(
    value: "loading" | "ready" | "lite" | "unsupported" | "lost",
  ): void {
    root.dataset.sceneStatus = value;
    stage!.dataset.sceneStatus = value;
    syncPoster();
    syncMilestoneControls();
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
      width: window.innerWidth || document.documentElement.clientWidth,
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
      el.removeAttribute("data-scene-hover");
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
  function diagramSource(source: SVGSVGElement): string {
    const clone = source.cloneNode(true) as SVGSVGElement;
    const originals = [source, ...source.querySelectorAll<SVGElement>("*")];
    const copies = [clone, ...clone.querySelectorAll<SVGElement>("*")];
    const ids = new Set(originals.map((element) => element.id).filter(Boolean));
    const localReference = (value: string): string | null => {
      const id = value.match(/#([^#]+)$/)?.[1];
      return id && ids.has(id) ? `#${id}` : null;
    };
    const localUrls = (value: string): string =>
      value.replace(
        /url\(\s*(["']?)(.*?)\1\s*\)/g,
        (_match, _quote, url: string) => {
          const reference = localReference(url);
          return reference ? `url(${reference})` : "none";
        },
      );
    const properties = [
      "color",
      "fill",
      "fill-opacity",
      "fill-rule",
      "stroke",
      "stroke-opacity",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-dasharray",
      "stroke-dashoffset",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "font-variant",
      "letter-spacing",
      "text-transform",
      "text-anchor",
      "dominant-baseline",
      "paint-order",
      "visibility",
      "display",
      "stop-color",
      "stop-opacity",
      "flood-color",
      "flood-opacity",
      "filter",
    ];
    originals.forEach((element, index) => {
      const copy = copies[index];
      const computed = getComputedStyle(element);
      copy.removeAttribute("style");
      for (const property of properties) {
        const value = computed.getPropertyValue(property);
        if (value) copy.style.setProperty(property, localUrls(value));
      }
      for (const attribute of [...copy.attributes]) {
        if (/^on/i.test(attribute.name)) copy.removeAttributeNode(attribute);
        else if (/^(?:href|xlink:href|src)$/i.test(attribute.name)) {
          const reference = localReference(attribute.value);
          if (reference) attribute.value = reference;
          else copy.removeAttributeNode(attribute);
        } else if (attribute.value.includes("url(")) {
          attribute.value = localUrls(attribute.value);
        }
      }
    });
    // The texture is a self-contained snapshot of the actual exhibit diagram.
    clone
      .querySelectorAll(
        "script,style,foreignObject,image,iframe,audio,video,animate,animateMotion,animateTransform,set,mpath",
      )
      .forEach((element) => element.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const viewBox = source.viewBox.baseVal;
    const mount = source.closest<HTMLElement>(
      ".island-project__diagram, .island-project__reference",
    );
    if (mount) {
      const background = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      background.setAttribute("x", String(viewBox.x));
      background.setAttribute("y", String(viewBox.y));
      background.setAttribute("width", String(viewBox.width || 640));
      background.setAttribute("height", String(viewBox.height || 400));
      background.setAttribute("fill", getComputedStyle(mount).backgroundColor);
      clone.insertBefore(background, clone.firstChild);
    }
    clone.setAttribute("width", String(Math.max(1, viewBox.width || 640)));
    clone.setAttribute("height", String(Math.max(1, viewBox.height || 400)));
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  }
  function exhibitForCard(card: HTMLElement): IslandExhibitSelection | null {
    const id = card.dataset.islandCard;
    if (!id || !projectIds.includes(id)) return null;
    const cached = exhibitCache.get(id);
    if (cached) return cached;
    const label = card.querySelector("h4")?.textContent?.trim();
    if (!label) return null;
    const image = card.querySelector<HTMLImageElement>(
      ".island-project__preview img",
    );
    let src: string | null = null;
    if (image) {
      const actual = image.getAttribute("src");
      if (actual) {
        const url = new URL(actual, location.href);
        if (
          url.origin === location.origin &&
          url.pathname.startsWith("/projects/")
        )
          src = url.pathname + url.search;
      }
    } else {
      const diagram = card.querySelector<SVGSVGElement>(
        ".island-project__diagram svg, .island-project__reference svg",
      );
      if (diagram) {
        try {
          src = diagramSource(diagram);
        } catch {
          // The original HTML diagram stays available if snapshotting fails.
          return null;
        }
      }
    }
    if (!src) return null;
    const selection = { id, src, label };
    exhibitCache.set(id, selection);
    return selection;
  }
  function syncMilestoneControls(): void {
    for (const button of milestoneButtons) {
      button.disabled = !scene || root.dataset.view !== "3d";
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.islandMilestone) === selectedMilestone),
      );
    }
    for (const entry of milestoneEntries)
      entry.toggleAttribute(
        "data-milestone-selected",
        Number(entry.dataset.islandMilestoneEntry) === selectedMilestone,
      );
  }
  function syncSceneContent(handle: IslandSceneHandle, instant: boolean): void {
    const card =
      route.destination === "work"
        ? route.projectId
          ? cards.find((entry) => entry.dataset.islandCard === route.projectId)
          : route.sector !== "all"
            ? cards.find((entry) => entry.dataset.sector === route.sector)
            : null
        : null;
    handle.setProject(
      card ? exhibitForCard(card) : null,
      instant,
      route.projectId !== null,
    );
    handle.setMilestone(
      route.destination === "experience" ? selectedMilestone : null,
      route.destination === "experience" && selectedMilestone !== null,
    );
  }
  function activateDestination(destination: WorldDestination): void {
    if (destination !== route.destination) {
      navigateHash(destination);
      return;
    }
    const panel = panels.find(
      (entry) => entry.dataset.islandPanel === destination,
    );
    const card = cards.find(
      (entry) => entry.dataset.islandCard === route.projectId,
    );
    const target =
      card?.querySelector<HTMLElement>(".island-project__links a") ??
      card?.querySelector<HTMLElement>("h4") ??
      (destination === "contact"
        ? panel?.querySelector<HTMLElement>('a[href^="mailto:"]')
        : null) ??
      panel?.querySelector<HTMLElement>("[data-island-heading]");
    if (target) {
      if (!target.matches("a,button,[tabindex]"))
        target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      scrollWithinPanel(target, "nearest");
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
        onActivate: (destination) => {
          if (disposed || abort.signal.aborted || token !== generation) return;
          activateDestination(destination);
        },
        onHover: (destination) => {
          if (disposed || abort.signal.aborted || token !== generation) return;
          for (const hotspot of hotspots)
            hotspot.toggleAttribute(
              "data-scene-hover",
              hotspot.dataset.islandHotspot === destination,
            );
        },
        onHotspots: (points) => {
          if (disposed || abort.signal.aborted) return;
          const returningHome =
            route.destination === "home" && scene?.getMetrics().cameraMoving;
          for (const point of points) {
            const el = hotspots.find(
              (node) => node.dataset.islandHotspot === point.destination,
            );
            if (!el) continue;
            if (returningHome) {
              el.hidden = false;
              el.style.removeProperty("left");
              el.style.removeProperty("top");
              continue;
            }
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
            // A lost GPU handle has disposed itself; an explicit retry needs a new one.
            scene = null;
            activeQuality = null;
            runtimeFailed = true;
            canvas!.style.visibility = "hidden";
            for (const hotspot of hotspots)
              hotspot.removeAttribute("data-scene-hover");
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
      // Loading can finish after another route has committed. Reveal that final
      // state immediately rather than replaying navigation from startup time.
      handle.setMotion(false);
      handle.setDestination(route.destination, true);
      syncSceneContent(handle, true);
      handle.setMotion(latest.motion);
      handle.renderFrame?.();
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
    if (!motionAllowed) transitions.cancel();
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
  function scrollWithinPanel(
    target: HTMLElement,
    block: "start" | "nearest",
  ): void {
    const panel = target.closest<HTMLElement>("[data-island-panel]");
    if (!panel) return;
    const style = getComputedStyle(panel);
    if (!/auto|scroll/.test(style.overflowY)) {
      target.scrollIntoView({ block, behavior: "instant" });
      return;
    }
    const bounds = panel.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const inset = Number.parseFloat(style.scrollPaddingTop) || 0;
    const top = bounds.top + panel.clientTop + inset;
    const bottom = bounds.top + panel.clientTop + panel.clientHeight - 16;
    let delta = 0;
    if (block === "start" || box.top < top || box.height > bottom - top)
      delta = box.top - top;
    else if (box.bottom > bottom) delta = box.bottom - bottom;
    if (delta)
      panel.scrollTo({
        top: Math.max(0, panel.scrollTop + delta),
        behavior: "instant",
      });
  }
  function focusForRoute(isInitial: boolean, old: IslandRoute): void {
    const panel = panels.find(
      (el) => el.dataset.islandPanel === route.destination,
    );
    if (isInitial || old.destination !== route.destination) {
      if (panel) panel.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (isInitial) {
      const directTarget = route.projectId
        ? document.getElementById(`project-${route.projectId}`)
        : route.aboutSection
          ? document.getElementById(route.aboutSection)
          : null;
      if (directTarget) scrollWithinPanel(directTarget, "start");
      return;
    }
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
          : root.querySelector<HTMLElement>('.island-brand[href="#home"]');
      target?.focus({ preventScroll: true });
      returnFocus = null;
      return;
    }
    const target = route.projectId
      ? document.getElementById(`project-${route.projectId}`)
      : route.aboutSection
        ? document.getElementById(route.aboutSection)
        : panel?.querySelector<HTMLElement>("[data-island-heading]");
    if (target instanceof HTMLElement) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      scrollWithinPanel(
        target,
        route.projectId || route.aboutSection ? "start" : "nearest",
      );
    }
    if (old.projectId && !route.projectId && route.destination === "work") {
      const trigger = projectReturnFocus?.isConnected
        ? projectReturnFocus
        : root.querySelector<HTMLElement>(
            `[href="#project-${CSS.escape(old.projectId)}"]`,
          );
      if (trigger?.getClientRects().length) {
        trigger.focus({ preventScroll: true });
        scrollWithinPanel(trigger, "nearest");
      }
      projectReturnFocus = null;
    }
  }
  function syncGallery(): void {
    let visible = 0;
    for (const card of cards) {
      const selected = card.dataset.islandCard === route.projectId;
      card.hidden = route.projectId
        ? !selected
        : route.sector !== "all" && card.dataset.sector !== route.sector;
      if (!card.hidden) visible++;
      card.classList.toggle("is-selected", selected);
      card
        .querySelectorAll<HTMLElement>(
          "[data-island-project-extra],[data-island-project-navigation]",
        )
        .forEach((element) => {
          element.hidden = !selected;
        });
    }
    root
      .querySelectorAll<HTMLElement>("[data-island-collection]")
      .forEach((collection) => {
        collection.hidden = ![
          ...collection.querySelectorAll<HTMLElement>("[data-island-card]"),
        ].some((card) => !card.hidden);
      });
    root
      .querySelectorAll<HTMLElement>("[data-island-collection-header]")
      .forEach((header) => {
        header.hidden = route.projectId !== null;
      });
    root
      .querySelectorAll<HTMLElement>("[data-island-gallery-grid]")
      .forEach((grid) => {
        grid.dataset.selected = String(route.projectId !== null);
      });
    const count = root.querySelector<HTMLElement>(
      "[data-island-gallery-count]",
    );
    if (count) count.textContent = String(visible);
    const empty = root.querySelector<HTMLElement>(
      "[data-island-gallery-empty]",
    );
    if (empty) empty.hidden = visible !== 0;
    root
      .querySelectorAll<HTMLAnchorElement>("a[data-island-filter]")
      .forEach((anchor) => {
        if (anchor.dataset.islandFilter === route.sector)
          anchor.setAttribute("aria-current", "true");
        else anchor.removeAttribute("aria-current");
        const url = new URL(location.href);
        const sector = anchor.dataset.islandFilter;
        if (!sector || sector === "all") url.searchParams.delete("sector");
        else url.searchParams.set("sector", sector);
        url.hash = "work";
        anchor.href = url.pathname + url.search + url.hash;
      });
  }
  function syncRoute(initial = false): void {
    if (disposed) return;
    if (!initial && location.href === previousHref) return;
    const old = route;
    route = parseIslandUrl(location.href, projectIds);
    previousHref = location.href;
    const next = route;
    const update = () => {
      if (route !== next || disposed) return;
      root.dataset.destination = route.destination;
      document.documentElement.dataset.destination = route.destination;
      if (route.destination === "home") {
        // Navigation targets stay available while the room camera pulls back.
        for (const hotspot of hotspots) {
          hotspot.hidden = false;
          hotspot.style.removeProperty("left");
          hotspot.style.removeProperty("top");
        }
      }
      syncPoster();
      root.dataset.selectedProject = route.projectId ?? "";
      root.dataset.sector = route.sector;
      for (const panel of panels)
        panel.hidden = panel.dataset.islandPanel !== route.destination;
      syncGallery();
      if (route.destination !== "experience") {
        selectedMilestone = null;
        syncMilestoneControls();
      }
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
          const target = new URL(
            el.getAttribute("href") ?? "/",
            location.origin,
          );
          target.search = location.search;
          target.hash = location.hash;
          el.href = target.pathname + target.search + target.hash;
        });
      root.dispatchEvent(new CustomEvent("island:route", { detail: route }));
      // Retarget before fitting the new room viewport, preserving the current
      // animated zoom instead of snapping the previous room to the new layout.
      scene?.setDestination(
        route.destination,
        reduced.matches || preferences.motion === "off",
      );
      scene?.resize();
      if (scene)
        syncSceneContent(
          scene,
          reduced.matches || preferences.motion === "off",
        );
      focusForRoute(initial, old);
      scene?.renderFrame?.();
      metrics();
    };
    const changed =
      old.destination !== next.destination ||
      old.projectId !== next.projectId ||
      old.sector !== next.sector ||
      old.aboutSection !== next.aboutSection;
    transitions.run(
      old,
      next,
      !initial && changed && !reduced.matches && preferences.motion !== "off",
      update,
    );
  }
  function navigate(url: URL, trigger?: HTMLElement): void {
    const next = parseIslandUrl(url, projectIds);
    if (trigger && next.destination !== "home" && route.destination === "home")
      returnFocus = trigger;
    if (trigger && next.projectId && !route.projectId)
      projectReturnFocus = trigger;
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
      if (
        event.defaultPrevented ||
        event.isComposing ||
        (event.target instanceof Element &&
          event.target.closest(
            "select,input,textarea,[contenteditable=true],[role=combobox]",
          ))
      )
        return;
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
  function previewMilestone(index: number | null): void {
    if (route.destination !== "experience") return;
    scene?.setMilestone(index, false);
    metrics();
  }
  for (const button of milestoneButtons) {
    const index = Number(button.dataset.islandMilestone);
    const entry = milestoneEntries.find(
      (element) => Number(element.dataset.islandMilestoneEntry) === index,
    );
    button.addEventListener("focus", () => previewMilestone(index), { signal });
    button.addEventListener("blur", () => previewMilestone(selectedMilestone), {
      signal,
    });
    entry?.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType !== "touch") previewMilestone(index);
      },
      { signal },
    );
    entry?.addEventListener(
      "pointerleave",
      () => {
        const focused = milestoneButtons.find(
          (milestone) => milestone === document.activeElement,
        );
        previewMilestone(
          focused ? Number(focused.dataset.islandMilestone) : selectedMilestone,
        );
      },
      { signal },
    );
    button.addEventListener(
      "click",
      () => {
        if (route.destination !== "experience") return;
        selectedMilestone = selectedMilestone === index ? null : index;
        syncMilestoneControls();
        scene?.setMilestone(selectedMilestone, true);
        metrics();
      },
      { signal },
    );
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
      syncRoute();
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
    transitions.dispose();
    stopScene();
    clearTimeout(resizeTimer);
    clearTimeout(clockTimer);
    events.abort();
    exhibitCache.clear();
    selectedMilestone = null;
    syncMilestoneControls();
    root.dataset.bound = "false";
    root.classList.remove("island-enhanced");
    document.documentElement.classList.remove("island-enhanced");
    for (const panel of panels) panel.hidden = false;
    for (const card of cards) {
      card.hidden = false;
      card.classList.remove("is-selected");
    }
    root
      .querySelectorAll<HTMLElement>(
        "[data-island-project-extra],[data-island-project-navigation],[data-island-collection],[data-island-collection-header]",
      )
      .forEach((element) => {
        element.hidden = false;
      });
    root
      .querySelectorAll<HTMLElement>("[data-island-gallery-grid]")
      .forEach((grid) => {
        delete grid.dataset.selected;
      });
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
  // Architecture diagrams are static exhibits here; the island owns motion.
  root
    .querySelectorAll<SVGSVGElement>(".island-project__diagram svg.diagram")
    .forEach((diagram) => {
      diagram.pauseAnimations?.();
    });
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
