import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SceneResources } from "./resources";

class OpaqueGTAOPass extends GTAOPass {
  override render(...args: Parameters<GTAOPass["render"]>): void {
    const mask = this.camera.layers.mask;
    this.camera.layers.disable(1);
    try {
      super.render(...args);
    } finally {
      this.camera.layers.mask = mask;
    }
  }
}

/** Contact depth is a desktop enhancement; the low-power path stays a single pass. */
export function createRendering(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  resources: SceneResources,
  high: boolean,
) {
  renderer.info.autoReset = false;
  if (!high)
    return {
      render() {
        renderer.info.reset();
        renderer.render(scene, camera);
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
  scene.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      !Array.isArray(o.material) &&
      o.material.transparent
    )
      o.layers.set(1);
  });
  camera.layers.enable(1);
  const ao = resources.own(new OpaqueGTAOPass(scene, camera, 1, 1));
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
  return {
    render() {
      renderer.info.reset();
      composer.render();
    },
    resize(w: number, h: number, dpr: number) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
    },
  };
}
