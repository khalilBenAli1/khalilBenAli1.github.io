/**
 * The keep renderer: one stone mesh, one sky, instanced flames, two point
 * clouds. It owns its frame loop and nothing in the document.
 *
 * `setTarget(u)` takes the road position chosen by main.ts (0 at the gate,
 * 5 at the signal fire); the camera eases toward it, and each fire lights as
 * the camera reaches it.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { buildWorld, SUMMIT_Y, SUMMIT_Z, type Fire } from "./world";

export interface KeepSceneOptions {
  canvas: HTMLCanvasElement;
  /** Phones and weak GPUs: fewer particles, no antialiasing, lower density. */
  low: boolean;
  /** False freezes time; the scene then only redraws when the road moves. */
  motion: boolean;
  milestones: number;
  onLost: () => void;
}

export interface KeepMetrics {
  frames: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
  cameraZ: number;
  litFires: number;
  running: boolean;
}

export interface KeepScene {
  setTarget(u: number, instant?: boolean): void;
  setMotion(enabled: boolean): void;
  resize(): void;
  metrics(): KeepMetrics;
  dispose(): void;
}

const MAX_FIRES = 16;
const FOG = new Color("#15292b");
/* Low and almost dead ahead: the keep is backlit, the road catches the light. */
const MOON = new Vector3(-0.095, 0.407, -0.908).normalize();

/* Camera stations, one per value of u. See main.ts for where each one sits. */
const STATIONS: readonly { at: [number, number, number]; look: [number, number, number] }[] = [
  { at: [0, 2.3, 27], look: [0, 6.4, -30] },
  { at: [0, 1.9, -8.6], look: [0, 3.8, -50] },
  { at: [0.4, 2.05, -50.5], look: [0, 5.2, -84] },
  { at: [-0.5, 1.95, -68.4], look: [0, 6.6, -104] },
  { at: [0, SUMMIT_Y + 2.15, -98.4], look: [0, SUMMIT_Y + 2.3, SUMMIT_Z] },
  { at: [2.6, SUMMIT_Y + 2.1, -101.6], look: [-0.5, SUMMIT_Y + 2.7, SUMMIT_Z] },
];

const NOISE = /* glsl */ `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 17.1;
    amp *= 0.5;
  }
  return sum;
}
`;

/* Shared by everything that sits in the air: distance fog plus low mist. */
const FOG_FN = /* glsl */ `
uniform vec3 uFog;
uniform vec3 uCamera;
float fogAmount(vec3 world) {
  float dist = length(world - uCamera);
  float far = 1.0 - exp(-pow(dist * 0.0125, 2.0));
  float mist = exp(-max(world.y, 0.0) * 0.4) * (1.0 - exp(-dist * 0.035)) * 0.62;
  return clamp(max(far, mist), 0.0, 1.0);
}
`;

const STONE_VERTEX = /* glsl */ `
attribute float aTint;
varying vec3 vWorld;
varying float vTint;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const STONE_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uMoon;
uniform vec4 uFires[${MAX_FIRES}];
varying vec3 vWorld;
varying float vTint;
${NOISE}
${FOG_FN}
void main() {
  /* Faceted normals from the surface itself: no normal attribute to store. */
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 toCamera = normalize(uCamera - vWorld);
  if (dot(normal, toCamera) < 0.0) normal = -normal;

  vec3 stone = mix(vec3(0.27, 0.31, 0.3), vec3(0.47, 0.48, 0.43), vTint);
  float grime = fbm(vWorld.xz * 0.33 + vWorld.y * 0.21);
  stone *= 0.62 + 0.62 * grime;

  if (abs(normal.y) < 0.6) {
    /* Masonry courses on anything upright. */
    float along = dot(vWorld.xz, vec2(normal.z, -normal.x));
    float row = floor(vWorld.y / 0.62);
    vec2 cell = vec2((along + mod(row, 2.0) * 0.7) / 1.4, vWorld.y / 0.62);
    vec2 inCell = fract(cell);
    float mortar = smoothstep(0.0, 0.035, inCell.x) * smoothstep(0.0, 0.08, inCell.y);
    stone *= mix(0.5, 1.0, mortar) * (0.82 + 0.36 * hash(floor(cell)));
  } else if (vWorld.y < 0.02) {
    /* Flagstones on the road, bare earth beside it. */
    float row = floor(vWorld.z / 0.72);
    vec2 cell = vec2((vWorld.x + hash(vec2(row, 3.0)) * 1.1) / 1.05, vWorld.z / 0.72);
    vec2 inCell = fract(cell);
    float joint = smoothstep(0.0, 0.05, inCell.x) * smoothstep(0.0, 0.075, inCell.y);
    float road = 1.0 - smoothstep(3.6, 5.4, abs(vWorld.x) + (grime - 0.5) * 2.4);
    vec3 flag = stone * mix(0.4, 1.0, joint) * (0.66 + 0.6 * hash(floor(cell)));
    vec3 earth = vec3(0.1, 0.13, 0.105) * (0.55 + 0.9 * grime);
    stone = mix(earth, flag, road);
  }

  float moonlight = max(dot(normal, uMoon), 0.0);
  float skylight = 0.5 + 0.5 * normal.y;
  vec3 color = stone * (
    vec3(0.055, 0.1, 0.105) * (0.4 + 0.9 * skylight) +
    vec3(0.4, 0.66, 0.68) * moonlight * 1.05
  );

  for (int i = 0; i < ${MAX_FIRES}; i++) {
    vec4 fire = uFires[i];
    if (fire.w <= 0.001) continue;
    vec3 toFire = fire.xyz - vWorld;
    float distanceSquared = dot(toFire, toFire);
    float falloff = fire.w / (1.0 + 0.3 * distanceSquared);
    float facing = max(dot(normal, toFire * inversesqrt(distanceSquared)), 0.0);
    color += stone * vec3(1.0, 0.5, 0.17) * falloff * (0.14 + 0.86 * facing) * 3.4;
  }

  color = mix(color, uFog, fogAmount(vWorld));
  /* A soft shoulder so firelit stone near a flame does not clip. */
  color = color / (1.0 + color * 0.35);
  gl_FragColor = vec4(pow(color, vec3(0.86)), 1.0);
}
`;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 view = viewMatrix * vec4(position, 0.0);
  gl_Position = (projectionMatrix * vec4(view.xyz, 1.0)).xyww;
}
`;

const SKY_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uFog;
uniform vec3 uMoon;
uniform float uTime;
varying vec3 vDirection;
${NOISE}
void main() {
  vec3 direction = normalize(vDirection);
  float height = clamp(direction.y, 0.0, 1.0);
  vec3 color = mix(uFog * 1.18, vec3(0.014, 0.036, 0.048), pow(height, 0.5));

  float toMoon = dot(direction, uMoon);
  color += vec3(0.5, 0.78, 0.76) * pow(max(toMoon, 0.0), 14.0) * 0.3;
  color += vec3(0.5, 0.78, 0.76) * pow(max(toMoon, 0.0), 160.0) * 0.45;

  vec2 sky = direction.xz / (direction.y + 0.35);
  float cloud = smoothstep(0.48, 0.86, fbm(sky * 1.7 + vec2(uTime * 0.006, 0.0))) * (1.0 - height);
  color = mix(color, uFog * 1.5, cloud * 0.7);
  /* The disc goes on last, so thin cloud dims the moon without greying it. */
  float disc = smoothstep(0.99925, 0.99945, toMoon);
  color = mix(color, vec3(0.9, 0.97, 0.92) * (1.0 - cloud * 0.12), disc);

  vec2 grid = floor(sky * 150.0);
  float star = step(0.9965, hash(grid)) * smoothstep(0.1, 0.5, height);
  color += vec3(0.75, 0.86, 0.82) * star * (0.35 + 0.65 * hash(grid + 3.0));

  gl_FragColor = vec4(pow(color, vec3(0.86)), 1.0);
}
`;

const FLAME_VERTEX = /* glsl */ `
attribute vec3 iOrigin;
attribute float iSize;
attribute float iSeed;
attribute float iLit;
varying vec2 vUv;
varying float vSeed;
varying float vLit;
varying float vFog;
${FOG_FN}
void main() {
  vUv = position.xy + 0.5;
  vSeed = iSeed;
  vLit = iLit;
  vFog = fogAmount(iOrigin);
  vec4 view = viewMatrix * vec4(iOrigin, 1.0);
  /* The quad is far larger than the flame so its glow has room to fall off. */
  view.xy += vec2(position.x * iSize * 3.4, (position.y + 0.26) * iSize * 3.4);
  gl_Position = projectionMatrix * view;
}
`;

const FLAME_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vLit;
varying float vFog;
${NOISE}
void main() {
  /* Flame space: x across the fire, y from 0 at the bowl to 1 at the tip. */
  vec2 p = vec2((vUv.x - 0.5) * 3.4, (vUv.y - 0.24) * 3.4);
  float time = uTime * 1.5 + vSeed * 31.0;
  float t = clamp(p.y / 1.05, 0.0, 1.0);

  float drift = fbm(vec2(p.x * 2.4 + vSeed * 9.0, p.y * 1.9 - time));
  float tongues = fbm(vec2(p.x * 5.2 - vSeed * 4.0, p.y * 3.1 - time * 1.8));
  float x = p.x - (drift - 0.5) * 0.62 * t;

  /* A teardrop: full at the bowl, drawn to a point, torn by the tongues. */
  float profile = (0.4 * (1.0 - t) * (0.5 + 0.5 * sqrt(1.0 - t)) + 0.015) * (0.72 + 0.62 * tongues);
  float across = abs(x) / profile;
  float body = 1.0 - smoothstep(0.3, 1.0, across);
  body *= smoothstep(-0.05, 0.07, p.y) * (1.0 - smoothstep(0.8, 1.0, t));
  body *= smoothstep(0.0, 0.3, tongues + (1.0 - t) * 1.15 - 0.42);
  body *= vLit;

  float heat = body * (1.0 - t * 0.62) * (1.0 - across * 0.35);
  vec3 flame = mix(vec3(0.72, 0.1, 0.02), vec3(1.0, 0.45, 0.07), smoothstep(0.0, 0.42, heat));
  flame = mix(flame, vec3(1.0, 0.8, 0.4), smoothstep(0.38, 0.78, heat));
  flame = mix(flame, vec3(1.0, 0.97, 0.86), smoothstep(0.78, 1.0, heat));

  vec2 fromHeart = p - vec2(0.0, 0.3);
  float glow = exp(-dot(fromHeart, fromHeart) * 2.1) * 0.3 * vLit;
  vec3 color = flame * body * 1.2 + vec3(1.0, 0.44, 0.12) * glow;

  gl_FragColor = vec4(color * (1.0 - vFog * 0.8), 1.0);
}
`;

const EMBER_VERTEX = /* glsl */ `
attribute vec4 aSeed;
attribute float aFire;
uniform float uTime;
uniform float uScale;
uniform vec4 uFires[${MAX_FIRES}];
varying float vAlpha;
void main() {
  vec4 fire = uFires[int(aFire)];
  float life = fract(uTime * (0.1 + aSeed.x * 0.16) + aSeed.y);
  float reach = 1.4 + aSeed.z * 3.2;
  vec3 world = position + vec3(
    sin(life * 7.0 + aSeed.w * 6.28) * 0.5 * life,
    life * reach,
    cos(life * 5.0 + aSeed.z * 6.28) * 0.5 * life
  );
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = uScale * (0.035 + aSeed.x * 0.05) * (1.0 - life * 0.6) / max(-view.z, 0.1);
  vAlpha = smoothstep(0.0, 0.08, life) * (1.0 - life) * min(fire.w, 1.0);
}
`;

const EMBER_FRAGMENT = /* glsl */ `
precision highp float;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float dot2 = 1.0 - smoothstep(0.0, 0.25, dot(p, p));
  gl_FragColor = vec4(vec3(1.0, 0.56, 0.2) * dot2 * vAlpha * 1.5, 1.0);
}
`;

/* Ash drifts in a box that travels with the camera, so it is never used up. */
const ASH_VERTEX = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uScale;
uniform vec3 uCamera;
varying float vAlpha;
void main() {
  vec3 box = vec3(26.0, 11.0, 34.0);
  vec3 p = position;
  p.y -= uTime * (0.16 + aSeed.x * 0.22);
  p.x += sin(uTime * 0.31 + aSeed.y * 6.28) * 0.9;
  vec3 world = uCamera + mod(p - uCamera, box) - vec3(box.x * 0.5, 3.0, box.z - 4.0);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;
  float depth = max(-view.z, 0.1);
  gl_PointSize = uScale * (0.014 + aSeed.z * 0.022) / depth;
  vAlpha = (0.22 + 0.4 * aSeed.x) * smoothstep(0.6, 3.0, depth) * (1.0 - smoothstep(18.0, 30.0, depth));
}
`;

const ASH_FRAGMENT = /* glsl */ `
precision highp float;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float flake = 1.0 - smoothstep(0.05, 0.25, dot(p, p));
  gl_FragColor = vec4(vec3(0.56, 0.62, 0.58) * flake * vAlpha, 1.0);
}
`;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function flameGeometry(fires: readonly Fire[]): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
      3,
    ),
  );
  const origin = new Float32Array(fires.length * 3);
  const size = new Float32Array(fires.length);
  const seed = new Float32Array(fires.length);
  fires.forEach((fire, i) => {
    origin.set([fire.x, fire.y, fire.z], i * 3);
    size[i] = fire.size;
    seed[i] = (i * 0.618) % 1;
  });
  geometry.setAttribute("iOrigin", new InstancedBufferAttribute(origin, 3));
  geometry.setAttribute("iSize", new InstancedBufferAttribute(size, 1));
  geometry.setAttribute("iSeed", new InstancedBufferAttribute(seed, 1));
  geometry.setAttribute(
    "iLit",
    new InstancedBufferAttribute(new Float32Array(fires.length), 1),
  );
  geometry.instanceCount = fires.length;
  return geometry;
}

function emberGeometry(fires: readonly Fire[], perMetre: number): BufferGeometry {
  const positions: number[] = [];
  const seeds: number[] = [];
  const owners: number[] = [];
  let state = 97;
  const random = (): number => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  fires.forEach((fire, index) => {
    const count = Math.round(perMetre * (4 + fire.size * 5));
    for (let i = 0; i < count; i += 1) {
      const spread = fire.size * 0.28;
      positions.push(
        fire.x + (random() - 0.5) * spread,
        fire.y + random() * 0.2,
        fire.z + (random() - 0.5) * spread,
      );
      seeds.push(random(), random(), random() * Math.min(fire.size, 2.4), random());
      owners.push(index);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 4));
  geometry.setAttribute("aFire", new Float32BufferAttribute(owners, 1));
  return geometry;
}

function ashGeometry(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  let state = 4099;
  const random = (): number => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  for (let i = 0; i < count; i += 1) {
    positions.set([random() * 26, random() * 11, random() * 34], i * 3);
    seeds.set([random(), random(), random()], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 3));
  return geometry;
}

export function createKeepScene(options: KeepSceneOptions): KeepScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: !options.low,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
  } catch {
    return null;
  }
  try {
    if (!renderer.capabilities.isWebGL2) throw new Error("WebGL2 required");
    return assemble(options, renderer);
  } catch {
    renderer.dispose();
    return null;
  }
}

function assemble(options: KeepSceneOptions, renderer: WebGLRenderer): KeepScene {
  const { canvas, low } = options;
  renderer.setClearColor(FOG, 1);

  const world = buildWorld(options.milestones);
  /* The signal fire is built last and must never be the one left out. */
  const fires =
    world.fires.length > MAX_FIRES
      ? [...world.fires.slice(0, MAX_FIRES - 1), world.fires[world.fires.length - 1]]
      : world.fires;
  const fireUniform = Array.from({ length: MAX_FIRES }, () => new Vector4());
  const shared = {
    uTime: { value: 0 },
    uCamera: { value: new Vector3() },
    uFog: { value: FOG },
    uMoon: { value: MOON },
    uFires: { value: fireUniform },
    uScale: { value: 1 },
  };

  const scene = new Scene();
  const camera = new PerspectiveCamera(54, 1, 0.1, 600);

  const sky = new Mesh(
    new SphereGeometry(1, 24, 12),
    new ShaderMaterial({
      uniforms: shared,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: BackSide,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  /* Drawn after the stone, at the far plane: only open sky is ever shaded. */
  sky.renderOrder = 1;
  scene.add(sky);

  const stone = new Mesh(
    world.geometry,
    new ShaderMaterial({
      uniforms: shared,
      vertexShader: STONE_VERTEX,
      fragmentShader: STONE_FRAGMENT,
      side: DoubleSide,
    }),
  );
  stone.frustumCulled = false;
  scene.add(stone);

  const additive = { blending: AdditiveBlending, depthWrite: false, transparent: true };
  const flames = new Mesh(
    flameGeometry(fires),
    new ShaderMaterial({
      uniforms: shared,
      vertexShader: FLAME_VERTEX,
      fragmentShader: FLAME_FRAGMENT,
      ...additive,
    }),
  );
  flames.frustumCulled = false;
  flames.renderOrder = 2;
  scene.add(flames);
  const lit = flames.geometry.getAttribute("iLit") as InstancedBufferAttribute;

  const embers = new Points(
    emberGeometry(fires, low ? 1 : 2.2),
    new ShaderMaterial({
      uniforms: shared,
      vertexShader: EMBER_VERTEX,
      fragmentShader: EMBER_FRAGMENT,
      ...additive,
    }),
  );
  embers.frustumCulled = false;
  embers.renderOrder = 3;
  scene.add(embers);

  const ash = new Points(
    ashGeometry(low ? 260 : 700),
    new ShaderMaterial({
      uniforms: shared,
      vertexShader: ASH_VERTEX,
      fragmentShader: ASH_FRAGMENT,
      ...additive,
    }),
  );
  ash.frustumCulled = false;
  ash.renderOrder = 3;
  scene.add(ash);

  const route = new CatmullRomCurve3(
    STATIONS.map((station) => new Vector3(...station.at)),
    false,
    "catmullrom",
    0.35,
  );
  const gaze = new CatmullRomCurve3(
    STATIONS.map((station) => new Vector3(...station.look)),
    false,
    "catmullrom",
    0.35,
  );
  const last = STATIONS.length - 1;
  const position = new Vector3();
  const target = new Vector3();
  const buffer = new Vector2();

  let motion = options.motion;
  let goal = 0;
  let current = 0;
  let clock = 0;
  let previous = 0;
  let frames = 0;
  let frame = 0;
  let running = false;
  let disposed = false;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  const maxPixelRatio = low ? 1.25 : 1.75;
  let slowFrames = 0;
  let failed = false;
  /* The fires catch over the first moments instead of popping in lit. */
  let kindle = motion ? 0 : 1;

  function applySize(): void {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    /* A portrait screen needs a taller cone to keep the gate towers in. */
    camera.fov = camera.aspect < 0.8 ? 74 : camera.aspect < 1.25 ? 62 : 54;
    /* The words sit on the left of a wide screen and at the foot of a tall
       one, so the road moves to the right or up to stay clear of them. */
    if (camera.aspect > 1.25) {
      camera.setViewOffset(width, height, -0.15 * width, 0, width, height);
    } else if (camera.aspect < 0.8) {
      camera.setViewOffset(width, height, 0, 0.17 * height, width, height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    shared.uScale.value = renderer.getDrawingBufferSize(buffer).y;
  }

  function resize(): void {
    const nextWidth = Math.max(canvas.clientWidth, 1);
    const nextHeight = Math.max(canvas.clientHeight, 1);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    applySize();
    draw();
  }

  function place(): void {
    const t = Math.min(Math.max(current / last, 0), 1);
    route.getPoint(t, position);
    gaze.getPoint(t, target);
    if (motion) {
      /* Breath: a slow drift so a still page is never a frozen frame. */
      position.x += Math.sin(clock * 0.31) * 0.05;
      position.y += Math.sin(clock * 0.47) * 0.035;
    }
    camera.position.copy(position);
    camera.lookAt(target);
    shared.uCamera.value.copy(position);

    for (let i = 0; i < MAX_FIRES; i += 1) {
      const fire = fires[i];
      if (!fire) {
        fireUniform[i].set(0, 0, 0, 0);
        continue;
      }
      const reached = smoothstep(fire.igniteZ + 3.5, fire.igniteZ - 1.5, position.z);
      const level = (fire.base + (1 - fire.base) * reached) * kindle;
      const flicker = motion
        ? 0.86 +
          0.09 * Math.sin(clock * 9.1 + i * 2.7) +
          0.05 * Math.sin(clock * 23.0 + i * 5.1)
        : 0.92;
      lit.setX(i, level);
      fireUniform[i].set(fire.x, fire.y + fire.size * 0.3, fire.z, level * flicker * fire.size);
    }
    lit.needsUpdate = true;
  }

  /* A shader the GPU rejects, or a render that throws, hands the page back
     to its painted backdrop instead of leaving a blank canvas over it. */
  function fail(): void {
    if (failed || disposed) return;
    failed = true;
    window.setTimeout(options.onLost, 0);
  }
  renderer.debug.onShaderError = fail;

  function draw(): void {
    if (disposed || failed || width === 0) return;
    try {
      place();
      shared.uTime.value = clock;
      renderer.render(scene, camera);
      frames += 1;
    } catch {
      fail();
    }
  }

  function settled(): boolean {
    return Math.abs(goal - current) < 0.0004 && kindle >= 1;
  }

  function tick(now: number): void {
    frame = 0;
    if (disposed) return;
    const delta = Math.min(Math.max((now - previous) / 1000, 0), 0.1);
    previous = now;
    if (motion) {
      clock += delta;
      kindle = Math.min(kindle + delta / 1.8, 1);
      current += (goal - current) * (1 - Math.exp(-delta * 3.6));

      /* Shed resolution rather than frames when the GPU cannot keep up. A
         steady 30 fps (a phone saving power) is left alone. */
      slowFrames = delta > 0.045 ? slowFrames + 1 : Math.max(slowFrames - 1, 0);
      if (slowFrames > 40 && pixelRatio > 0.75) {
        pixelRatio = Math.max(pixelRatio - 0.25, 0.75);
        slowFrames = 0;
        applySize();
      }
    } else {
      current = goal;
      kindle = 1;
    }
    draw();
    if (!failed && (motion || !settled())) schedule();
    else running = false;
  }

  function schedule(): void {
    if (frame || disposed || document.hidden) {
      if (document.hidden) running = false;
      return;
    }
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function wake(): void {
    if (running) return;
    previous = performance.now();
    schedule();
  }

  const onVisibility = (): void => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
    } else if (motion) {
      wake();
    } else {
      draw();
    }
  };
  const onLost = (event: Event): void => {
    event.preventDefault();
    options.onLost();
  };
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);

  resize();
  wake();

  return {
    setTarget(u, instant = false) {
      goal = Math.min(Math.max(u, 0), last);
      if (instant || !motion) current = goal;
      if (motion) wake();
      else draw();
    },
    setMotion(enabled) {
      motion = enabled;
      if (enabled) {
        wake();
      } else {
        current = goal;
        kindle = 1;
        draw();
      }
    },
    resize,
    metrics() {
      return {
        frames,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        pixelRatio,
        cameraZ: camera.position.z,
        litFires: fireUniform.filter((fire) => fire.w > 0.5).length,
        running,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const object of [sky, stone, flames, embers, ash]) {
        object.geometry.dispose();
        (object.material as ShaderMaterial).dispose();
      }
      renderer.dispose();
    },
  };
}
