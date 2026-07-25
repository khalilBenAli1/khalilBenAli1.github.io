/**
 * Deterministic Manhattan router for the background trace network.
 *
 * The whole composition is authored in ISOTROPIC SCREEN UNITS: one unit is half
 * the viewport height, x grows right, y grows up, so (0,0) is screen centre and
 * the visible box is x ∈ [-aspect, aspect], y ∈ [-1, 1]. traces.ts multiplies
 * these by each plane's half-frustum height, which exactly cancels perspective
 * foreshortening — so a coordinate here lands on the same screen pixel on every
 * depth plane, and depth is carried by brightness and parallax rate alone. That
 * is what makes the layout authorable: what you compose is what you see.
 *
 * Authored coordinates are FRACTIONS (x of half-width, y of half-height), so the
 * composition is viewport-relative; |value| > 1 is deliberately offscreen.
 *
 * Two rules do all the work of making this read as engineering rather than neon
 * spaghetti, and they mirror src/lib/diagrams-data.ts exactly:
 *   1. every run is axis-aligned and snapped to a coarse grid, so runs align
 *      across paths and elbows stack;
 *   2. tributaries terminate ON a shared collector bus with a node mark, they
 *      never run alongside it.
 *
 * Nothing here may cross CLEARING — the hero copy zone. Jittered values are
 * re-rolled until the route clears it; a path that cannot is dropped, because
 * legibility outranks composition.
 */

/** Half-height fractions of the hero copy block, measured at 1440×900 (the
 *  widest the block gets relative to the viewport; 1920×1080 is a subset).
 *  The left edge stops at the copy, not at the container gutter — the gutter
 *  holds no text, and giving it back is what lets the left margin carry a rail
 *  instead of reading as an unfinished corner. */
const CLEARING = { x0: -0.83, x1: 0.1, y0: -0.52, y1: 0.55 };

/** Coarse lattice, in isotropic units. Rails are authored on even multiples so
 *  parallel runs sit 0.16 apart (~72 px at 900 h) and never read as a double. */
const GRID = 0.08;

/** Corner radius, clamped per corner to 0.45× the shorter adjacent run. Small:
 *  a large radius turns a routed corner into a rounded rectangle. */
const ELBOW = 0.042;

/** Sub-segments per quarter-turn. The pulse mask is evaluated per-fragment, so
 *  this only has to satisfy the eye's tolerance for a 0.04-unit corner. */
const ELBOW_STEPS = 3;

export const PLANES = [
  { z: -4, dim: 1.0, par: 0.38 },
  { z: -11, dim: 0.74, par: 0.22 },
  { z: -22, dim: 0.5, par: 0.12 },
] as const;

type Plane = 0 | 1 | 2;
/** A fixed fraction, or a [lo, hi] band the PRNG picks from. */
type Span = number | readonly [number, number];
type Step = readonly ["x" | "y", Span];

interface PathSpec {
  readonly plane: Plane;
  /** Entry point [x, y] as fractions. Always offscreen. */
  readonly at: readonly [Span, Span];
  /** Alternating runs: ["x", v] is a horizontal run to x = v. */
  readonly to: readonly Step[];
  /** Junction LED at the terminal (terminals on a bus only). */
  readonly led?: boolean;
}

export interface TracePath {
  plane: Plane;
  /** Polyline in isotropic units, elbows already rounded. */
  pts: number[][];
  /** Arc length at each point, isotropic units. */
  s: number[];
  len: number;
  /** 0..1, drives per-path pulse offset / rate / width / gap jitter. */
  seed: number;
}

export interface TraceNode {
  plane: Plane;
  x: number;
  y: number;
  led: boolean;
}

export interface Layout {
  paths: TracePath[];
  nodes: TraceNode[];
}

/* ---------- authored composition ---------------------------------------- */

/* Shared rails. Every path referencing one of these resolves to the identical
   snapped coordinate, which is what makes a bus read as a bus rather than as
   several lines that happen to be near each other.

   Rails are allocated by hand, on even grid multiples, so that no two parallel
   runs on any plane land within 0.16 of each other where their spans overlap —
   a near-miss pair reads as a rendering fault, and an exact pair as one
   over-bright line. preview.ts reports violations. */
const BUS_V = 0.42; // mid-plane backbone, immediately right of the hero copy
const BUS_V2 = 0.56; // its lower leg, after the jog
const BUS_H = -0.8; // far-plane collector, spans the bottom band
const TOP = 0.88; // the top rail, spans the full width
const TURN = 0.8; // where the collector turns down and F2 joins it

/**
 * Eleven paths over three planes, framing the clearing: a rail across the top,
 * a collector across the bottom, the backbone down the right of the copy, and a
 * spine in the left margin. Everything else is a tributary onto one of those.
 *
 * Ordering is load-bearing: the last four are what drawRange drops once the
 * hero scrolls away, so they are spread over all three planes and over the top,
 * bottom, left and right regions — thinning must make the network sparser,
 * never lopsided.
 */
const SPECS: readonly PathSpec[] = [
  /* --- mid plane: the backbone and its tributaries ---------------------- */
  // M1 — the backbone: down past the copy, one jog right, off the bottom.
  { plane: 1, at: [BUS_V, 1.2], to: [["y", -0.32], ["x", BUS_V2], ["y", -1.2]] },
  // M2 — in from the left edge along the top rail, down, onto the backbone.
  {
    plane: 1,
    at: [-1.2, TOP],
    to: [["x", 0.32], ["y", 0.72], ["x", BUS_V]],
    led: true,
  },
  // M3 — up from the bottom edge, across the bottom band, onto the low leg.
  { plane: 1, at: [-0.56, -1.2], to: [["y", -0.96], ["x", BUS_V2]] },
  // M4 — in from the right edge, down the right margin, onto the low leg.
  {
    plane: 1,
    at: [1.2, [0.08, 0.24]],
    to: [["x", 0.96], ["y", -0.48], ["x", BUS_V2]],
    led: true,
  },

  /* --- near plane: brightest, so kept out of the reading column --------- */
  // N1 — up from the bottom edge, out the right edge.
  {
    plane: 0,
    at: [[-0.28, -0.2], -1.2],
    to: [["y", -1.12], ["x", 0.24], ["y", -0.64], ["x", 1.2]],
  },
  // N2 — down from the top edge through the photo margin, out the right edge.
  {
    plane: 0,
    at: [[0.56, 0.64], 1.2],
    to: [["y", 0.4], ["x", 0.16], ["y", -0.16], ["x", 1.2]],
  },

  /* --- far plane: dimmest, longest runs, its own collector --------------- */
  // F1 — the bottom collector, full width, then down and off the bottom.
  { plane: 2, at: [-1.2, BUS_H], to: [["x", TURN], ["y", -1.2]] },
  // F2 — down from the top edge, onto the collector where F1 turns down.
  {
    plane: 2,
    at: [[1.0, 1.1], 1.2],
    to: [["y", 0.64], ["x", TURN], ["y", BUS_H]],
    led: true,
  },

  /* --- thinned first when the hero leaves -------------------------------- */
  // F3 — the left-margin spine, full height, onto the collector.
  { plane: 2, at: [-0.94, 1.2], to: [["y", 0.32], ["x", -0.85], ["y", BUS_H]] },
  // N3 — an L in the bottom-left corner, in from the left, off the bottom.
  {
    plane: 0,
    at: [-1.2, -0.56],
    to: [["x", -0.96], ["y", -1.04], ["x", [-0.44, -0.36]], ["y", -1.2]],
  },
  // F4 — a short feeder up from the bottom edge onto the collector.
  {
    plane: 2,
    at: [[0.08, 0.16], -1.2],
    to: [["y", -1.12], ["x", [-0.36, -0.28]], ["y", BUS_H]],
  },
];

/** Extra node marks on elbows that want a terminal-block read. Fractions. */
const EXTRA_NODES: readonly (readonly [Plane, number, number, boolean])[] = [
  [1, BUS_V, -0.32, false], // the backbone's own jog
  [1, 0.96, -0.48, false], // M4's turn down the right margin
  [0, 0.24, -0.64, true], // N1's turn out to the right edge
  [0, 0.16, -0.16, false], // N2's turn out to the right edge
  [2, -0.85, 0.32, false], // F3's step into the left margin
];

/* ---------- machinery ---------------------------------------------------- */

/** mulberry32. Fixed seed: layout must be identical across builds and reloads. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const snap = (v: number): number => Math.round(v / GRID) * GRID;

/** Axis-aligned segment vs. the clearing rect, in isotropic units. */
function hitsClearing(
  a: number[],
  b: number[],
  cx0: number,
  cx1: number,
): boolean {
  const x0 = Math.min(a[0], b[0]);
  const x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const y1 = Math.max(a[1], b[1]);
  return x1 > cx0 && x0 < cx1 && y1 > CLEARING.y0 && y0 < CLEARING.y1;
}

/** Replace each interior corner with a quarter turn. */
function round(corners: number[][]): number[][] {
  if (corners.length < 3) return corners;
  const out: number[][] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i += 1) {
    const p = corners[i - 1];
    const c = corners[i];
    const n = corners[i + 1];
    const inLen = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const outLen = Math.hypot(n[0] - c[0], n[1] - c[1]);
    const r = Math.min(ELBOW, inLen * 0.45, outLen * 0.45);
    if (r < 1e-4) {
      out.push(c);
      continue;
    }
    const din = [(c[0] - p[0]) / inLen, (c[1] - p[1]) / inLen];
    const dout = [(n[0] - c[0]) / outLen, (n[1] - c[1]) / outLen];
    // Arc centre O sits one radius back along the incoming run and one radius
    // along the outgoing one; p(t) sweeps -dout → +din around it.
    const ox = c[0] - din[0] * r + dout[0] * r;
    const oy = c[1] - din[1] * r + dout[1] * r;
    for (let k = 0; k <= ELBOW_STEPS; k += 1) {
      const th = (k / ELBOW_STEPS) * Math.PI * 0.5;
      const co = Math.cos(th);
      const si = Math.sin(th);
      out.push([
        ox + r * (-dout[0] * co + din[0] * si),
        oy + r * (-dout[1] * co + din[1] * si),
      ]);
    }
  }
  out.push(corners[corners.length - 1]);
  return out;
}

/**
 * @param aspect viewport width / height. Authored x fractions scale with it, so
 *   the composition stays viewport-relative instead of cropping.
 */
export function buildLayout(aspect: number, seed = 0x5eed_1a7c): Layout {
  const rnd = mulberry32(seed);
  const cx0 = CLEARING.x0 * aspect;
  const cx1 = CLEARING.x1 * aspect;

  const paths: TracePath[] = [];
  const nodes: TraceNode[] = [];

  for (const spec of SPECS) {
    const pick = (v: Span, ax: "x" | "y"): number => {
      const f = typeof v === "number" ? v : v[0] + rnd() * (v[1] - v[0]);
      return snap(ax === "x" ? f * aspect : f);
    };

    let corners: number[][] = [];
    let ok = false;
    // Jittered spans get re-rolled against the clearing; a fixed spec that
    // fails fails every time and is dropped on the first pass.
    for (let attempt = 0; attempt < 16 && !ok; attempt += 1) {
      let x = pick(spec.at[0], "x");
      let y = pick(spec.at[1], "y");
      corners = [[x, y]];
      for (const [axis, v] of spec.to) {
        if (axis === "x") x = pick(v, "x");
        else y = pick(v, "y");
        corners.push([x, y]);
      }
      ok = true;
      for (let i = 1; i < corners.length && ok; i += 1) {
        if (hitsClearing(corners[i - 1], corners[i], cx0, cx1)) ok = false;
      }
    }
    if (!ok) continue;

    const pts = round(corners);
    const s: number[] = [0];
    for (let i = 1; i < pts.length; i += 1) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      s.push(s[i - 1] + Math.hypot(dx, dy));
    }
    paths.push({ plane: spec.plane, pts, s, len: s[s.length - 1], seed: rnd() });

    // A terminal inside the viewport is a junction on a bus: mark it.
    const end = pts[pts.length - 1];
    if (Math.abs(end[0]) < aspect * 0.98 && Math.abs(end[1]) < 0.98) {
      nodes.push({
        plane: spec.plane,
        x: end[0],
        y: end[1],
        led: spec.led === true,
      });
    }
  }

  for (const [plane, fx, fy, led] of EXTRA_NODES) {
    nodes.push({ plane, x: snap(fx * aspect), y: snap(fy), led });
  }

  return { paths, nodes };
}

/** Exported for the layout preview harness only. */
export const DEBUG = { CLEARING, GRID };
