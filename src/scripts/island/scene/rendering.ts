import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { SceneResources } from "./resources";

// Layers are shared with picking: 0/1 physical opaque/transparent,
// 2/3 literal opaque/transparent. Explicit toneMapped=false selects literal color.
const PHYSICAL_OPAQUE = 0;
const PHYSICAL_TRANSPARENT = 1;
const LITERAL_OPAQUE = 2;
const LITERAL_TRANSPARENT = 3;
const OPAQUE = (1 << PHYSICAL_OPAQUE) | (1 << LITERAL_OPAQUE);
const TRANSPARENT = (1 << PHYSICAL_TRANSPARENT) | (1 << LITERAL_TRANSPARENT);
const ALL = OPAQUE | TRANSPARENT;

type MaterialState = {
  layer: number;
  visible: boolean;
  colorWrite: boolean;
};

class OpaqueGTAOPass extends GTAOPass {
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    private readonly selectOpaque: () => void,
  ) {
    super(scene, camera, 1, 1);
  }

  override render(...args: Parameters<GTAOPass["render"]>): void {
    this.selectOpaque();
    super.render(...args);
  }
}

/**
 * Physical surfaces receive one tone map; literal screens/bakes bypass it.
 * The AO depth buffer preserves occlusion when literal color is drawn afterward.
 */
export function createRendering(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  resources: SceneResources,
  high: boolean,
) {
  renderer.info.autoReset = false;
  const materialStates = new Map<THREE.Material, MaterialState>();
  const knownObjects = new WeakSet<THREE.Object3D>();

  function classify(): void {
    materialStates.clear();
    // Run for every frame: a GLB may arrive after the initial shader compilation.
    scene.traverse((object) => {
      if (object instanceof THREE.Light) object.layers.mask = ALL;
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      let mask = 0;
      for (const material of materials) {
        const literal = material.toneMapped === false;
        const layer = literal
          ? material.transparent
            ? LITERAL_TRANSPARENT
            : LITERAL_OPAQUE
          : material.transparent
            ? PHYSICAL_TRANSPARENT
            : PHYSICAL_OPAQUE;
        mask |= 1 << layer;
        materialStates.set(material, {
          layer,
          visible: material.visible,
          colorWrite: material.colorWrite,
        });
      }
      object.layers.mask = mask;
      if (!knownObjects.has(object)) {
        knownObjects.add(object);
        if (object.castShadow) renderer.shadowMap.needsUpdate = true;
      }
    });
  }

  function select(mask: number, hideLiteralColor = false): void {
    camera.layers.mask = mask;
    for (const [material, state] of materialStates) {
      material.visible = state.visible && (mask & (1 << state.layer)) !== 0;
      material.colorWrite =
        state.colorWrite &&
        !(hideLiteralColor && state.layer === LITERAL_OPAQUE);
    }
  }

  function restoreMaterials(): void {
    for (const [material, state] of materialStates) {
      material.visible = state.visible;
      material.colorWrite = state.colorWrite;
    }
  }

  classify();
  camera.layers.mask = ALL;
  if (!high)
    return {
      render() {
        classify();
        const mask = camera.layers.mask;
        try {
          camera.layers.mask = ALL;
          renderer.info.reset();
          renderer.render(scene, camera);
        } finally {
          camera.layers.mask = mask;
        }
      },
      resize(_w: number, _h: number, _dpr: number) {},
    };

  const target = resources.own(
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 2,
    }),
  );
  const composer = resources.own(new EffectComposer(renderer, target));
  const render = resources.own(new RenderPass(scene, camera));
  const ao = resources.own(
    new OpaqueGTAOPass(scene, camera, () => select(OPAQUE)),
  );
  // Leaves are double-sided geometry; their reverse faces must also occlude color.
  ao.normalMaterial.side = THREE.DoubleSide;
  ao.blendIntensity = 1.15;
  ao.updateGtaoMaterial({
    radius: 0.55,
    distanceExponent: 1.5,
    thickness: 1,
    scale: 1,
    samples: 12,
  });
  ao.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 5,
    rings: 2,
    samples: 12,
  });
  // Three's pass owns its targets; these two shader materials also need disposal.
  resources.own(ao.gtaoMaterial);
  resources.own(ao.blendMaterial);
  const output = resources.own(new OutputPass());
  composer.addPass(render);
  composer.addPass(ao);
  composer.addPass(output);

  const copyDepthMaterial = resources.own(
    new THREE.ShaderMaterial({
      name: "Copy opaque scene depth for literal-color compositing",
      glslVersion: THREE.GLSL3,
      uniforms: { sceneDepth: { value: ao.depthTexture } },
      vertexShader: `out vec2 depthUv;
        void main() { depthUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `in vec2 depthUv; uniform sampler2D sceneDepth;
        void main() { gl_FragDepth = texture(sceneDepth, depthUv).r; }`,
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
      blending: THREE.NoBlending,
      toneMapped: false,
    }),
  );
  const copyDepth = resources.own(new FullScreenQuad(copyDepthMaterial));
  const multisampled =
    renderer.getContext().getContextAttributes()?.antialias === true;
  const depthOnlyMaterial = resources.own(
    new THREE.MeshDepthMaterial({
      colorWrite: false,
      depthWrite: true,
      side: THREE.DoubleSide,
    }),
  );

  return {
    render() {
      classify();
      const mask = camera.layers.mask;
      const autoClear = renderer.autoClear;
      const renderTarget = renderer.getRenderTarget();
      const background = scene.background;
      const overrideMaterial = scene.overrideMaterial;
      try {
        renderer.info.reset();
        // Literal surfaces still write depth and cast shadows in the beauty pass,
        // but their display-referred colors never enter OutputPass's tone mapper.
        select(OPAQUE, true);
        composer.render();
        renderer.setRenderTarget(null);
        renderer.autoClear = false;
        scene.background = null;
        if (multisampled) {
          // A single depth texel cannot represent every MSAA sample of a sloped
          // surface. Copying it rejects half the literal samples and darkens them.
          // Rebuild only depth at the default framebuffer's native sample locations.
          select(OPAQUE);
          renderer.clearDepth();
          scene.overrideMaterial = depthOnlyMaterial;
          renderer.render(scene, camera);
          scene.overrideMaterial = overrideMaterial;
        } else {
          copyDepth.render(renderer);
        }
        select(1 << LITERAL_OPAQUE);
        renderer.render(scene, camera);
        // Glass and transparent text share one back-to-front sort. Drawing glass
        // before the literal pass would erase its overlay on a screen behind it.
        select(TRANSPARENT);
        renderer.render(scene, camera);
      } finally {
        restoreMaterials();
        scene.background = background;
        scene.overrideMaterial = overrideMaterial;
        camera.layers.mask = mask;
        renderer.autoClear = autoClear;
        renderer.setRenderTarget(renderTarget);
      }
    },
    resize(w: number, h: number, dpr: number) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
    },
  };
}
