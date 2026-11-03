import * as THREE from "three";
import type {
  Destination,
  IslandSceneHandle,
  IslandSceneOptions,
  ProjectedHotspot,
  SceneMetrics,
  SceneStatus,
  WorldDestination,
} from "../../../lib/island/types";
import { IslandCamera } from "./camera";
import { SceneResources } from "./resources";
import { createWorld, type IslandWorld } from "./world";

/** Progressive scene enhancement. It never owns route state or HTML panels. */
export async function createIslandScene(
  options: IslandSceneOptions,
): Promise<IslandSceneHandle | null> {
  const { canvas, signal } = options;
  if (signal.aborted) return null;
  const started = performance.now();
  const resources = new SceneResources();
  let status: SceneStatus = "loading";
  const report = (next: SceneStatus): void => {
    status = next;
    options.onStatus?.(next);
  };
  report("loading");
  if (signal.aborted) return null;

  let context: WebGL2RenderingContext | null = null;
  try {
    // Preflight avoids Three's noisy constructor error on an unsupported GPU.
    context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: options.quality === "high",
      depth: true,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
  } catch {
    /* Some privacy modes throw instead of returning null. */
  }
  if (!context) {
    report("unsupported");
    return null;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: true,
      depth: true,
      stencil: false,
    });
  } catch {
    report("unsupported");
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0xf0e9dc, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf6f3ec, 0x75746d, 2.6));
  const key = new THREE.DirectionalLight(0xfff1d8, 4.2);
  key.position.set(-5, 12, 8);
  key.castShadow = true;
  const shadowSize = options.quality === "high" ? 1024 : 512;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(key.shadow.camera, {
    left: -11,
    right: 11,
    top: 10,
    bottom: -10,
    near: 0.5,
    far: 35,
  });
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.035;
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xa6b9ff, 1.1);
  rim.position.set(7, 5, -7);
  scene.add(rim);

  let disposed = false;
  let ready = false;
  let lost = false;
  let visible = !document.hidden;
  let intersects = true;
  let motion = options.motion;
  let dirty = true;
  let raf = 0;
  let running = false;
  let frames = 0;
  let schedulerStarts = 0;
  let lastRender = 0;
  let lastTick = 0;
  let seconds = 0;
  let startupMs = 0;
  let renderCpuMs = 0;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let hovered: WorldDestination | null = null;
  let focused: WorldDestination | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let abortCompile: (() => void) | null = null;
  const originalCursor = canvas.style.cursor;
  const originalTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = "pan-y";

  let world: IslandWorld;
  try {
    world = createWorld(
      resources,
      options.quality,
      options.screens,
      invalidate,
    );
  } catch {
    resources.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.style.touchAction = originalTouchAction;
    report("unsupported");
    return null;
  }
  scene.add(world.root);
  const camera = new IslandCamera(world.anchors);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();

  function canRender(): boolean {
    return ready && !disposed && !lost && visible && intersects;
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = false;
    lastTick = 0;
  }

  function schedule(): void {
    if (!canRender() || running) return;
    running = true;
    schedulerStarts++;
    raf = requestAnimationFrame(tick);
  }

  function invalidate(): void {
    dirty = true;
    schedule();
  }

  function hotspots(): void {
    if (!options.onHotspots) return;
    scene.updateMatrixWorld(true);
    const points: ProjectedHotspot[] = [];
    for (const [destination, anchor] of Object.entries(world.anchors)) {
      projected
        .copy(anchor)
        .applyMatrix4(world.root.matrixWorld)
        .project(camera.camera);
      points.push({
        destination: destination as WorldDestination,
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        visible:
          projected.z >= -1 &&
          projected.z <= 1 &&
          Math.abs(projected.x) < 0.98 &&
          Math.abs(projected.y) < 0.98,
      });
    }
    options.onHotspots(points);
  }

  function render(now: number): void {
    camera.update(now);
    if (motion) world.update(seconds);
    const before = performance.now();
    renderer.render(scene, camera.camera);
    renderCpuMs = performance.now() - before;
    frames++;
    lastRender = now;
    dirty = false;
    hotspots();
  }

  function tick(now: number): void {
    raf = 0;
    if (!canRender()) {
      stop();
      return;
    }
    if (lastTick)
      seconds += motion ? Math.min(0.05, (now - lastTick) / 1000) : 0;
    lastTick = now;
    // Environmental motion renders at 30 Hz; an explicit camera transition gets 60.
    if (dirty || camera.active || now - lastRender >= 1000 / 30 - 1)
      render(now);
    if (motion || camera.active || dirty) raf = requestAnimationFrame(tick);
    else stop();
  }

  function resize(): void {
    if (disposed || lost) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || canvas.clientWidth || 1);
    height = Math.max(1, rect.height || canvas.clientHeight || 1);
    pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      options.quality === "high" ? 1.5 : 1.25,
      Math.sqrt(2_000_000 / (width * height)),
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.resize(width, height);
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  }

  function pick(clientX: number, clientY: number): WorldDestination | null {
    if (!ready || disposed || lost) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      (-(clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera.camera);
    // Include the landform as an occluder, so a hidden exhibit cannot be picked.
    const hit = raycaster.intersectObject(world.root, true)[0];
    return (
      (hit?.object.userData.destination as WorldDestination | undefined) ?? null
    );
  }

  function updateFocus(): void {
    world.setFocus(focused ?? hovered);
    canvas.style.cursor = hovered ? "pointer" : originalCursor;
    invalidate();
  }

  let press: {
    id: number;
    x: number;
    y: number;
    destination: WorldDestination | null;
  } | null = null;
  function pointerDown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      destination: pick(event.clientX, event.clientY),
    };
  }
  function pointerMove(event: PointerEvent): void {
    if (
      press &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9
    )
      press = null;
    if (event.pointerType === "touch") return;
    const next = pick(event.clientX, event.clientY);
    if (hovered !== next) {
      hovered = next;
      updateFocus();
    }
  }
  function pointerUp(event: PointerEvent): void {
    const current = press;
    press = null;
    if (
      !current ||
      current.id !== event.pointerId ||
      Math.hypot(event.clientX - current.x, event.clientY - current.y) > 9
    )
      return;
    const hit = pick(event.clientX, event.clientY);
    if (hit && hit === current.destination) options.onActivate(hit);
  }
  function pointerCancel(): void {
    press = null;
  }
  function pointerLeave(): void {
    press = null;
    if (hovered) {
      hovered = null;
      updateFocus();
    }
  }
  function visibilityChange(): void {
    visible = !document.hidden;
    if (visible) invalidate();
    else stop();
  }
  function contextLost(event: Event): void {
    event.preventDefault();
    if (disposed || lost) return;
    lost = true;
    stop();
    report("lost");
    dispose(false);
  }
  function onAbort(): void {
    abortCompile?.();
    dispose();
  }

  function dispose(notify = true): void {
    if (disposed) return;
    disposed = true;
    ready = false;
    stop();
    abortCompile?.();
    abortCompile = null;
    signal.removeEventListener("abort", onAbort);
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerCancel);
    canvas.removeEventListener("pointerleave", pointerLeave);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    canvas.style.cursor = originalCursor;
    canvas.style.touchAction = originalTouchAction;
    key.shadow.map?.dispose();
    key.shadow.mapPass?.dispose();
    resources.dispose();
    scene.clear();
    renderer.dispose();
    // Remove the loss listener first; our own cleanup must not report a failure.
    if (!lost) renderer.forceContextLoss();
    if (notify) report("disposed");
  }

  signal.addEventListener("abort", onAbort, { once: true });
  document.addEventListener("visibilitychange", visibilityChange);
  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("pointerdown", pointerDown, { passive: true });
  canvas.addEventListener("pointermove", pointerMove, { passive: true });
  canvas.addEventListener("pointerup", pointerUp, { passive: true });
  canvas.addEventListener("pointercancel", pointerCancel, { passive: true });
  canvas.addEventListener("pointerleave", pointerLeave, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  }
  if (typeof IntersectionObserver !== "undefined") {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        intersects = entries[0]?.isIntersecting ?? true;
        if (intersects) invalidate();
        else stop();
      },
      { rootMargin: "80px" },
    );
    intersectionObserver.observe(canvas);
  }
  resize();
  camera.setDestination(options.initialDestination, true, performance.now());
  if (signal.aborted) {
    dispose();
    return null;
  }

  try {
    if (renderer.extensions.has("KHR_parallel_shader_compile")) {
      const aborted = new Promise<null>((resolve) => {
        abortCompile = () => resolve(null);
      });
      await Promise.race([
        renderer.compileAsync(scene, camera.camera),
        aborted,
      ]);
      abortCompile = null;
    } else {
      renderer.compile(scene, camera.camera);
    }
    if (disposed || signal.aborted || lost) {
      dispose();
      return null;
    }
    ready = true;
    renderer.shadowMap.needsUpdate = true;
    // A useful first frame is painted before readiness is exposed to the page.
    render(performance.now());
    startupMs = performance.now() - started;
    report("ready");
    if (motion) schedule();
  } catch {
    if (!disposed) {
      report("unsupported");
      dispose(false);
    }
    return null;
  }

  return {
    setDestination(destination: Destination, instant = false): void {
      if (disposed) return;
      camera.setDestination(destination, instant || !motion, performance.now());
      invalidate();
    },
    setMotion(enabled): void {
      if (disposed) return;
      motion = enabled;
      if (!enabled) {
        camera.settle();
        world.update(0);
      }
      invalidate();
    },
    setFocus(destination): void {
      if (disposed || focused === destination) return;
      focused = destination;
      updateFocus();
    },
    resize,
    getMetrics(): SceneMetrics {
      return {
        status,
        frames,
        schedulerStarts,
        loopActive: running,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        pixelRatio,
        width,
        height,
        quality: options.quality,
        startupMs,
        renderCpuMs,
      };
    },
    dispose,
  };
}
