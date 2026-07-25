/**
 * "The Backbone" — the fixed WebGL background.
 *
 * A depth-fogged network of Manhattan-routed traces on three planes, with narrow
 * packet pulses travelling the routes, over an almost-subliminal palette wash.
 * It is the site's own diagram language (src/lib/diagrams-data.ts: orthogonal
 * runs, collector buses, node marks, LEDs) extruded into depth.
 *
 * Composition lives in bg/layout.ts, the pulse mechanism in bg/traces.ts, the
 * wash in bg/aurora.ts. This file owns the renderer, the frame, and the
 * lifecycle. Four rules here matter more than they look:
 *
 *  1. ONE rAF on the page. Lenis is driven from gsap.ticker (motion/scroll.ts),
 *     so the background registers on the same ticker: frame order becomes
 *     Lenis → ScrollTrigger.update → this render, deterministically, with no
 *     one-frame lag and no second callback trip. Pausing means removing the
 *     ticker callback, never re-entering a rAF chain — that is how the old
 *     visibilitychange handler ended up running two loops forever.
 *  2. deltaMs is clamped. gsap.ticker.lagSmoothing(0) is set, so a tab stall or
 *     a GC pause hands us hundreds of ms and any phase integration jumps.
 *  3. Fading is a uniform, never canvas.style.opacity. The old code wrote
 *     opacity on every scroll event against a 0.5s CSS transition, which
 *     restarted the transition each write and lagged the hero fade by half a
 *     second.
 *  4. alpha: false. With an alpha canvas, additive blending accumulates the
 *     alpha channel too, so bright crossings read milky instead of glowing. The
 *     clear colour is --bg-0 exactly, which is what deleting the .orb divs (the
 *     canvas already painted over them) bought us.
 */
import * as THREE from "three";
import { gsap } from "./motion/gsap";
import { sampleScroll } from "./motion/scrollSignal";
import { buildLayout } from "./bg/layout";
import { createTraces, CAM_Z, type Traces } from "./bg/traces";
import { createAurora } from "./bg/aurora";
import type { BgUniforms } from "./bg/uniforms";

/** World units of Y drift across the whole document, before the per-plane
 *  weight (near 0.38 / mid 0.22 / far 0.12). */
const DRIFT = 4.5;
/** World units of camera x-drift across the document. Translation only — no
 *  dolly, no rotation, so every run stays axis-aligned and pixel-crisp. */
const CAM_DRIFT = 0.8;
/** Presence past the hero. Not zero: the network stays ambient page-long. */
const FADE_PAST_HERO = 0.35;

export async function initSpace(
  canvas: HTMLCanvasElement,
  tier: 1 | 2,
): Promise<void> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    depth: false, // nothing in the scene tests depth
    stencil: false,
  });
  renderer.setClearColor(0x06070c, 1);
  // Paint the bitmap once up front. If anything below this line fails, whatever
  // reveals the canvas shows --bg-0 rather than an opaque black rectangle.
  renderer.clear();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.z = CAM_Z;

  const shared: BgUniforms = {
    uFade: { value: 0 },
    uLift: { value: 1 },
    uTime: { value: 0 },
    uProg: { value: 0 },
    uSpeed: { value: 0 },
    uDrift: { value: 0 },
    uPx: { value: 1 },
  };

  const scene = new THREE.Scene();
  const aurora = createAurora(shared, tier === 2 ? 3 : 2);
  scene.add(aurora.blit);

  let traces: Traces | null = null;
  let builtAspect = window.innerWidth / window.innerHeight;
  if (tier === 2) {
    traces = createTraces(buildLayout(builtAspect), shared);
    scene.add(traces.group);
  }

  /* ---- sizing -----------------------------------------------------------
     Area-clamped pixel ratio, but never below 1: the look is 1-device-pixel
     hairlines, and rendering under native resolution would blur exactly the
     thing the design is made of. The heavy-shader budget is protected instead
     by shrinking the aurora target (aurora.setSize), which is where ~300
     ALU/px of cost actually lives. */
  let quality = 1;
  const applySize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const clamped = Math.min(
      window.devicePixelRatio,
      1.5,
      Math.sqrt(2_600_000 / (w * h)),
    );
    const pr = Math.max(1, clamped) * quality;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    shared.uPx.value = pr;
    const buf = new THREE.Vector2();
    renderer.getDrawingBufferSize(buf);
    aurora.setSize(buf.x, buf.y);
  };
  applySize();

  /* ---- frame ------------------------------------------------------------- */
  let fade = 0;
  let fadeTarget = 1;
  let adaptCap = 1;
  let ema = 16.7;
  let slow = 0;
  let adapted = false;
  let frame = 0;

  const tick = (_t: number, deltaMs: number): void => {
    const dt = Math.min(deltaMs, 33) / 16.667;
    const s = sampleScroll();

    shared.uTime.value += (dt * 16.667) / 1000;
    shared.uProg.value = s.progress;
    shared.uSpeed.value = s.speed;
    shared.uLift.value = 1 + s.speed * 0.25; // ≤ +25%, per the readability gate
    shared.uDrift.value = s.progress * DRIFT;
    camera.position.x = s.progress * CAM_DRIFT;

    fade += (fadeTarget - fade) * Math.min(1, 0.13 * dt);
    shared.uFade.value = fade;

    if (traces) {
      traces.tick(dt, s.speed);
      // Thinning removes real vertex work, unlike opacity. setDraw snaps to a
      // path boundary, so past the hero this drops the last four paths (F2, F3,
      // N3, F4 — three far, one near) and keeps the frame: the top rail, the
      // backbone and the full-width bottom collector all survive.
      const f = Math.max(0, (fade - FADE_PAST_HERO) / (1 - FADE_PAST_HERO));
      traces.setDraw(Math.min(adaptCap, 0.6 + 0.4 * f));
    }

    // The wash is band-limited and slow; 30 Hz is indistinguishable and halves
    // the only expensive shader in the scene.
    if ((frame++ & 1) === 0) aurora.render(renderer);
    renderer.render(scene, camera);

    if (!adapted) {
      ema += (Math.min(deltaMs, 100) - ema) * 0.1;
      slow = ema > 22 ? slow + 1 : 0;
      if (slow >= 90) {
        // One shot only. A closed loop oscillates visibly.
        adapted = true;
        quality = 0.75;
        adaptCap = 0.6;
        applySize();
      }
    }
  };

  let active = false;
  const start = (): void => {
    if (!active) {
      active = true;
      gsap.ticker.add(tick);
    }
  };
  const stop = (): void => {
    if (active) {
      active = false;
      gsap.ticker.remove(tick);
    }
  };

  /* ---- lifecycle --------------------------------------------------------- */
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start(),
  );

  // Presence is driven by the hero's own box, not a scroll constant, so adding
  // a section can never desynchronise it.
  const hero = document.querySelector(".hero");
  if (hero) {
    new IntersectionObserver(
      (entries) => {
        fadeTarget = entries[0].isIntersecting ? 1 : FADE_PAST_HERO;
      },
      { rootMargin: "20% 0px 0px 0px" },
    ).observe(hero);
  }

  // A lost context cannot be drawn to, and its bitmap would sit over the page
  // as opaque black. Give up the canvas and free what we can.
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    canvas.style.opacity = "0";
    traces?.dispose();
    aurora.dispose();
  });

  let resizeTimer = 0;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // iOS collapses its URL bar by firing resize with a height-only delta;
      // rebuilding the target for that is a visible hitch.
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w;
      lastH = h;
      applySize();
      const aspect = w / h;
      if (traces && Math.abs(aspect - builtAspect) / builtAspect > 0.08) {
        scene.remove(traces.group);
        traces.dispose();
        builtAspect = aspect;
        traces = createTraces(buildLayout(aspect), shared);
        scene.add(traces.group);
      }
    }, 150);
  });

  /* ---- first frame ------------------------------------------------------
     Linking a ~300-ALU fbm fragment inside the first render() can block for
     15–45 ms on an Intel driver. Compile both scenes first, paint one frame at
     uFade 0 (which is exactly --bg-0, so nothing pops), then reveal and let the
     ramp bring it in. */
  await aurora.compile(renderer);
  await renderer.compileAsync(scene, camera);
  aurora.render(renderer);
  renderer.render(scene, camera);
  canvas.style.opacity = "1";
  start();
}
