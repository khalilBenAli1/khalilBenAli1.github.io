/**
 * The trace network: every path in one LineSegments, one draw call, plus one
 * Points draw for the node marks.
 *
 * Motion is a mask, not movement — the geometry is static forever. Each fragment
 * knows its own arc length along its path (`vS`) and where its path's pulse head
 * currently is (`vP.y`), so a narrow band of brightness travels the route while
 * nothing in the buffer changes. This is the Cerebrium mechanism, and it is why
 * the whole animation costs one small attribute upload per frame.
 *
 * The mask is evaluated per FRAGMENT, not per vertex, which is what lets the
 * geometry stay coarse (~200 verts): a per-vertex mask would need the polyline
 * tessellated to a fraction of the pulse length just to avoid faceting the tail.
 *
 * Lines are native GL hairlines (1 device px, driver-clamped). That is deliberate
 * rather than a limitation: every run is axis-aligned and the camera never
 * rotates, so runs land exactly on pixel rows/columns and stay crisp with
 * antialiasing off. Only the small elbow arcs alias, and they are the dimmest
 * thing on screen.
 */
import * as THREE from "three";
import { PLANES, type Layout } from "./layout";
import type { TraceUniforms } from "./uniforms";

/** Half-frustum height at a plane's depth, for fov 60° and the camera at z=16.
 *  Multiplying isotropic layout units by this exactly cancels perspective, so a
 *  layout coordinate is the same screen pixel on every plane. */
export const CAM_Z = 16;
const HALF_H = (z: number): number =>
  Math.tan((60 * Math.PI) / 360) * (CAM_Z - z);

/* --- restraint dials, measured not guessed. scratchpad/bg3d/envelope.py takes
   a per-pixel max over a frame sequence with the page content hidden, which is
   the brightest state any pixel of this background ever reaches. At these
   levels the envelope's p99.9 sits under #2f3550 (the readability ceiling) and
   the base traces at about a fifth of the text luminance; the envelope MAX
   (~#23436b) exceeds that byte ceiling at the handful of T-junctions where two
   hairlines and a node dot stack additively, and still measures APCA Lc ~92 for
   body copy, so the Lc 90 requirement holds everywhere.
   Levels are pre-encode and blending happens in display space, so they are not
   proportional to the bytes you measure — re-measure after changing them. --- */
const BASE = 0.22; // base trace level, multiplied by the plane's dim
const PULSE = 0.055; // pulse peak level
const NODE = 0.14;
const LED = 0.02;
const FLOW = 0.55; // isotropic units/sec at rest
const FLOW_GAIN = 1.6; // × FLOW at full scroll speed
const PULSE_W = 0.22; // pulse length, isotropic units (~99 px at 900 h)
const LED_PERIOD = 2.6; // s

const TRACE_COL = new THREE.Color(0x262b40);
const NODE_COL = new THREE.Color(0x3b4260);
const VIOLET = new THREE.Color(0x7c5cff);
const SKY = new THREE.Color(0x38bdf8);

const TRACE_VERT = /* glsl */ `
attribute float aS;
attribute float aHead;
attribute float aPeriod;
attribute float aWidth;
attribute float aDim;
attribute float aPar;
uniform float uDrift;
varying float vS;
varying vec4 vP;
void main() {
  vec3 p = position;
  p.y += uDrift * aPar;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vS = aS;
  vP = vec4(aPeriod, aHead, aWidth, aDim);
}`;

const TRACE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uTrace;
uniform vec3 uViolet;
uniform vec3 uSky;
uniform float uBase;
uniform float uPulse;
uniform float uFade;
uniform float uLift;
varying float vS;
varying vec4 vP;
void main() {
  // Distance BEHIND the travelling head, wrapped into the path's pulse gap.
  // mod() keeps this exact forever because the head is fed as a wrapped phase.
  float d = mod(vP.y - vS, vP.x);
  float m = 1.0 - smoothstep(0.0, vP.z, d);
  m = pow(m, 1.5);                          // sharp head, long soft tail
  vec3 col = uTrace * uBase + mix(uViolet, uSky, m) * (uPulse * m);
  col *= vP.w * uFade * uLift;
  col = col / (1.0 + col * 0.6);            // soft knee: hue survives crossings
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const NODE_VERT = /* glsl */ `
attribute float aDim;
attribute float aPar;
attribute float aLed;
attribute float aPhase;
uniform vec3 uNode;
uniform vec3 uSky;
uniform float uDrift;
uniform float uTime;
uniform float uPx;
uniform float uFade;
uniform float uLift;
uniform float uNodeLevel;
uniform float uLedLevel;
varying vec3 vCol;
void main() {
  vec3 p = position;
  p.y += uDrift * aPar;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * mix(2.0, 2.8, aLed);
  float b = smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(uTime * ${((Math.PI * 2) / LED_PERIOD).toFixed(5)} + aPhase));
  float lvl = mix(uNodeLevel, uLedLevel * (0.3 + 0.7 * b), aLed);
  vCol = mix(uNode, uSky, aLed) * lvl * aDim * uFade * uLift;
}`;

const NODE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vCol;
void main() {
  float d = length(gl_PointCoord - 0.5);
  vec3 col = vCol * smoothstep(0.5, 0.12, d);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export interface Traces {
  group: THREE.Group;
  /** Advance the pulse phases and upload them. dt in frames (1 = 16.67 ms). */
  tick(dt: number, speed: number): void;
  /** 1 = full network, 0.6 = the last four paths dropped. */
  setDraw(fraction: number): void;
  dispose(): void;
}

export function createTraces(
  layout: Layout,
  shared: TraceUniforms,
): Traces {
  /* ---- geometry ---------------------------------------------------------- */
  let verts = 0;
  for (const p of layout.paths) verts += (p.pts.length - 1) * 2;

  const position = new Float32Array(verts * 3);
  const aS = new Float32Array(verts);
  const aHead = new Float32Array(verts);
  const aPeriod = new Float32Array(verts);
  const aWidth = new Float32Array(verts);
  const aDim = new Float32Array(verts);
  const aPar = new Float32Array(verts);

  /** Per-path pulse state. Phase is 0..1 and wraps exactly, so the head value
   *  handed to the shader never grows large enough to lose float precision. */
  const phase: number[] = [];
  const rate: number[] = [];
  const period: number[] = [];
  const range: [number, number][] = [];
  /** Vertex offset of every path start, plus the total. drawRange snaps to one
   *  of these; a count landing inside a path truncates it mid-elbow. */
  const bounds: number[] = [0];

  let v = 0;
  layout.paths.forEach((p) => {
    const plane = PLANES[p.plane];
    const h = HALF_H(plane.z);
    const per = p.len * (1.35 + p.seed * 1.25); // > path length ⇒ 0 or 1 pulse
    const wid = PULSE_W * (0.85 + p.seed * 0.3);
    const start = v;
    for (let i = 1; i < p.pts.length; i += 1) {
      for (const k of [i - 1, i]) {
        position[v * 3] = p.pts[k][0] * h;
        position[v * 3 + 1] = p.pts[k][1] * h;
        position[v * 3 + 2] = plane.z;
        aS[v] = p.s[k];
        aPeriod[v] = per;
        aWidth[v] = wid;
        aDim[v] = plane.dim;
        aPar[v] = plane.par;
        v += 1;
      }
    }
    range.push([start, v]);
    bounds.push(v);
    period.push(per);
    phase.push((p.seed * 7.13) % 1);
    rate.push((0.78 + p.seed * 0.44) / per); // cycles/sec per unit of flow
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
  geo.setAttribute("aPeriod", new THREE.BufferAttribute(aPeriod, 1));
  geo.setAttribute("aWidth", new THREE.BufferAttribute(aWidth, 1));
  geo.setAttribute("aDim", new THREE.BufferAttribute(aDim, 1));
  geo.setAttribute("aPar", new THREE.BufferAttribute(aPar, 1));
  const headAttr = new THREE.BufferAttribute(aHead, 1);
  headAttr.setUsage(THREE.StreamDrawUsage);
  geo.setAttribute("aHead", headAttr);

  const mat = new THREE.ShaderMaterial({
    vertexShader: TRACE_VERT,
    fragmentShader: TRACE_FRAG,
    uniforms: {
      uTrace: { value: TRACE_COL },
      uViolet: { value: VIOLET },
      uSky: { value: SKY },
      uBase: { value: BASE },
      uPulse: { value: PULSE },
      uFade: shared.uFade,
      uLift: shared.uLift,
      uDrift: shared.uDrift,
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 10;

  /* ---- node marks -------------------------------------------------------- */
  const n = layout.nodes.length;
  const nPos = new Float32Array(n * 3);
  const nDim = new Float32Array(n);
  const nPar = new Float32Array(n);
  const nLed = new Float32Array(n);
  const nPhase = new Float32Array(n);
  let ledIndex = 0;
  layout.nodes.forEach((node, i) => {
    const plane = PLANES[node.plane];
    const h = HALF_H(plane.z);
    nPos[i * 3] = node.x * h;
    nPos[i * 3 + 1] = node.y * h;
    nPos[i * 3 + 2] = plane.z;
    nDim[i] = plane.dim;
    nPar[i] = plane.par;
    nLed[i] = node.led ? 1 : 0;
    // Quarter-cycle apart. Two phases for four LEDs gave two synced pairs,
    // which is the one thing the jitter exists to prevent.
    if (node.led) nPhase[i] = ((ledIndex++ % 4) * Math.PI) / 2;
  });

  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute("aDim", new THREE.BufferAttribute(nDim, 1));
  nGeo.setAttribute("aPar", new THREE.BufferAttribute(nPar, 1));
  nGeo.setAttribute("aLed", new THREE.BufferAttribute(nLed, 1));
  nGeo.setAttribute("aPhase", new THREE.BufferAttribute(nPhase, 1));

  const nMat = new THREE.ShaderMaterial({
    vertexShader: NODE_VERT,
    fragmentShader: NODE_FRAG,
    uniforms: {
      uNode: { value: NODE_COL },
      uSky: { value: SKY },
      uNodeLevel: { value: NODE },
      uLedLevel: { value: LED },
      uFade: shared.uFade,
      uLift: shared.uLift,
      uTime: shared.uTime,
      uDrift: shared.uDrift,
      uPx: shared.uPx,
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const points = new THREE.Points(nGeo, nMat);
  points.frustumCulled = false;
  points.renderOrder = 11;

  const group = new THREE.Group();
  group.add(lines, points);

  return {
    group,
    tick(dt, speed) {
      const flow = FLOW * (1 + speed * FLOW_GAIN);
      const secs = (dt * 16.667) / 1000;
      for (let i = 0; i < phase.length; i += 1) {
        phase[i] = (phase[i] + rate[i] * flow * secs) % 1;
        // Contiguous per-path vertex runs, so this is 11 fills, not 200 writes.
        aHead.fill(phase[i] * period[i], range[i][0], range[i][1]);
      }
      headAttr.needsUpdate = true;
    },
    setDraw(fraction) {
      // Snap to the NEAREST path boundary, not the floor: at fraction 0.6 the
      // raw count (123) lands inside F1, truncating the bottom collector
      // mid-elbow, and snapping down to 116 would drop the whole far plane —
      // the lopsided result thinning is supposed to avoid. 126 keeps the
      // collector and thins 38.8%, closest to the intended ~40%.
      const target = verts * fraction;
      let count = bounds[bounds.length - 1];
      for (const b of bounds) {
        if (Math.abs(b - target) < Math.abs(count - target)) count = b;
      }
      geo.setDrawRange(0, count); // boundaries are even by construction
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      nGeo.dispose();
      nMat.dispose();
    },
  };
}
