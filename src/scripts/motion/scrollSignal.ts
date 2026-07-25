/**
 * One scroll signal, sampled once per frame from inside the render tick — never
 * from a scroll listener, so it cannot fire more than once per painted frame.
 *
 * The asymmetric attack/decay is the whole trick: a symmetric lerp either feels
 * mushy on the rise or snaps off too abruptly on release. Clamping BEFORE the
 * lerp (not after) stops a trackpad fling parking the value at the ceiling for
 * twenty frames.
 *
 * `speed` is unsigned and decays slowly — that is the one to modulate magnitude
 * with. Do NOT drive direction from sign(velocity): reversing a phase or a flow
 * reads as a glitch, not as responsiveness.
 */
import { getLenis } from "./scroll";

const NORM = 90; // px/frame that maps to |velocity| = 1 (Lenis lerp 0.1)
const ATTACK = 0.18; // rise rate — snappy
const DECAY = 0.06; // fall rate — slower, so releases keep some inertia
const DEAD = 0.002; // snap to exact 0 so nothing flickers at rest

let vel = 0;
let speed = 0;
let prog = 0;
let lastY = 0;

export interface ScrollSignal {
  /** 0..1 document progress, lerped. */
  progress: number;
  /** -1..1 signed. */
  velocity: number;
  /** 0..1 unsigned, decays slower than velocity. */
  speed: number;
}

export function sampleScroll(): ScrollSignal {
  const lenis = getLenis();
  let raw: number;
  let p: number;

  if (lenis) {
    raw = lenis.velocity / NORM;
    p = lenis.progress;
  } else {
    // No-Lenis path (reduced motion): derive both from the real scroll position.
    const max = document.documentElement.scrollHeight - window.innerHeight;
    p = max > 0 ? window.scrollY / max : 0;
    raw = (window.scrollY - lastY) / NORM;
    lastY = window.scrollY;
  }

  const k = Math.abs(raw) > Math.abs(vel) ? ATTACK : DECAY;
  vel += (Math.max(-1.4, Math.min(1.4, raw)) - vel) * k;
  if (Math.abs(vel) < DEAD) vel = 0;

  const t = Math.min(1, Math.abs(vel));
  speed += (t - speed) * (t > speed ? ATTACK : DECAY * 0.7);

  prog += (p - prog) * 0.12;
  return { progress: prog, velocity: vel, speed };
}
