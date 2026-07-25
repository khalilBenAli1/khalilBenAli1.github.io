/**
 * The base layer: a palette-locked fbm wash that replaces the two .orb divs.
 *
 * It is meant to be almost subliminal — a tonal gradient that kills the flatness
 * of a single flat hex, not an "aurora". If you can point at it in a screenshot
 * and name it, it is too strong. The mix amounts look absurdly small (0.018)
 * because they are applied in LINEAR space against a near-black base, where the
 * sRGB transfer curve is at its steepest: a 1% mix of #7c5cff already moves the
 * blue channel about twenty 8-bit levels.
 *
 * Every colour operation is mix(bg0, violet, x) / mix(…, sky, y). Nothing is
 * added, so the output cannot leave the token palette, and the violet→sky shift
 * with scroll progress comes for free.
 *
 * Two passes, and the colour management is done by hand in both — deliberately.
 * The aurora renders at 0.5× into an RGBA8 target holding DISPLAY-space values
 * (encoded manually at the end of the pass, no <colorspace_fragment>, and the
 * target keeps its default NoColorSpace so no hardware conversion is applied
 * either). The blit then passes those bytes straight through. Dither has to land
 * in display space right before quantisation — inside the shader after encoding
 * — because 1/255 in linear space near black is a ~100% perturbation, and
 * dithering into the target and then bilinear-filtering it would smear the noise
 * and bring the banding back. So: dither once in the target pass (breaks the
 * target's own 8-bit steps) and once in the blit (breaks the final ones).
 */
import * as THREE from "three";
import type { AuroraUniforms } from "./uniforms";

const BG = new THREE.Color(0x06070c);
const VIOLET = new THREE.Color(0x7c5cff);
const SKY = new THREE.Color(0x38bdf8);

/** Peak mix amounts at band = 1. Keep these in the thousandths. Interpolated
 *  with toFixed(4) because a value that lands on a whole number would emit an
 *  int literal and GLSL will not multiply a float by an int. */
const VIOLET_MIX = 0.011;
const SKY_MIX = 0.01;

const CLIP_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.999, 1.0); }`;

const NOISE = /* glsl */ `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < OCTAVES; i++) { v += a * snoise(p); p = rot * p * 2.03; a *= 0.5; }
  return v;
}`;

/** Interleaved Gradient Noise (Jimenez). ~4 ALU, and it beats Bayer at this
 *  scale. Error-diffusion cannot work on a GPU — pixels are independent. */
const DITHER = /* glsl */ `
float ign(vec2 c) {
  return fract(52.9829189 * fract(dot(c, vec2(0.06711056, 0.00583715))));
}
vec3 enc(vec3 c) {
  return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92,
             vec3(lessThanEqual(c, vec3(0.0031308))));
}`;

const AURORA_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uProg;
uniform float uSpeed;
uniform float uFade;
uniform float uRate;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
${NOISE}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  float t = uTime * 0.035 * uRate + uProg * 0.9;
  float n = fbm(p + vec2(t, -t * 0.4));
  #ifdef WARP
    n = fbm(p * 1.7 + vec2(-t * 0.6, t * 0.3) + n * 0.6);
  #endif
  float band = smoothstep(-0.25, 0.85, n) * (0.40 + uSpeed * 0.26);

  vec3 tint = uA;
  tint = mix(tint, uB, band * ${VIOLET_MIX.toFixed(4)});
  tint = mix(tint, uC,
             smoothstep(0.35, 1.0, band) * ${SKY_MIX.toFixed(4)} * (0.3 + uProg * 0.7));
  tint *= 1.0 - 0.42 * length(uv - 0.5);
  // At uFade 0 this is exactly --bg-0, so the canvas can be revealed before the
  // wash has ramped in without a visible step against the page background.
  vec3 col = enc(mix(uA, tint, uFade));
  col += (1.0 / 255.0) * ign(gl_FragCoord.xy) - (0.5 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}`;

const BLIT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uRes;
${DITHER}
void main() {
  // Already display-space: pass through, dither, done. No colour conversion.
  vec3 col = texture2D(uMap, gl_FragCoord.xy / uRes).rgb;
  col += (1.0 / 255.0) * ign(gl_FragCoord.xy) - (0.5 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}`;

export interface Aurora {
  /** Rendered into the target, off the main scene. */
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Add this to the main scene; it draws first (opaque, renderOrder -10). */
  blit: THREE.Mesh;
  setSize(w: number, h: number): void;
  /** Warm the shader with the target BOUND — see the implementation note. */
  compile(renderer: THREE.WebGLRenderer): Promise<void>;
  render(renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export function createAurora(
  shared: AuroraUniforms,
  octaves: 2 | 3,
): Aurora {
  const rtRes = new THREE.Vector2(2, 2);
  const outRes = new THREE.Vector2(2, 2);
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  const quadGeo = new THREE.PlaneGeometry(2, 2);

  const auroraMat = new THREE.ShaderMaterial({
    vertexShader: CLIP_VERT,
    fragmentShader: AURORA_FRAG,
    defines: { OCTAVES: octaves, ...(octaves === 3 ? { WARP: "" } : {}) },
    uniforms: {
      uRes: { value: rtRes },
      uTime: shared.uTime,
      uProg: shared.uProg,
      uSpeed: shared.uSpeed,
      uFade: shared.uFade,
      // Tier 1 halves the drift rate: on a phone the wash is the whole
      // background, and slower reads calmer with no traces over it.
      uRate: { value: octaves === 3 ? 1 : 0.5 },
      uA: { value: BG },
      uB: { value: VIOLET },
      uC: { value: SKY },
    },
    depthTest: false,
    depthWrite: false,
  });
  const auroraQuad = new THREE.Mesh(quadGeo, auroraMat);
  auroraQuad.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(auroraQuad);
  const camera = new THREE.Camera();

  const blitMat = new THREE.ShaderMaterial({
    vertexShader: CLIP_VERT,
    fragmentShader: BLIT_FRAG,
    uniforms: { uMap: { value: rt.texture }, uRes: { value: outRes } },
    depthTest: false,
    depthWrite: false,
  });
  const blit = new THREE.Mesh(quadGeo, blitMat);
  blit.frustumCulled = false;
  blit.renderOrder = -10;

  return {
    scene,
    camera,
    blit,
    setSize(w, h) {
      outRes.set(w, h);
      // 0.5× normally; tighter on very large buffers so the ~300 ALU/px pass
      // stays inside the heavy-shading budget (~0.9 Mpx) whatever the display.
      const scale = Math.min(0.5, Math.sqrt(900_000 / (w * h)));
      const rw = Math.max(2, Math.round(w * scale));
      const rh = Math.max(2, Math.round(h * scale));
      rt.setSize(rw, rh);
      rtRes.set(rw, rh);
    },
    /**
     * Three keys its program cache on outputColorSpace, and that value is
     * renderer.outputColorSpace (sRGB) with no target bound but the working
     * colour space (linear) once one is (three.module.js:7585, pushed into the
     * key at :7814). Compiling this scene targetless therefore warms a program
     * this pass never uses, and the ~300 ALU/px fbm would link synchronously
     * inside the first render — 15–45 ms on an Intel driver, exactly the stall
     * compileAsync exists to avoid. Bind the target first.
     */
    async compile(renderer) {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      await renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(prev);
    },
    render(renderer) {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(prev);
    },
    dispose() {
      rt.dispose();
      quadGeo.dispose();
      auroraMat.dispose();
      blitMat.dispose();
    },
  };
}
